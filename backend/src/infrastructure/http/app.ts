/**
 * @file src/infrastructure/http/app.ts
 * @description Fastify application factory.
 *
 * This module exports a `createApp()` function that builds the Fastify instance
 * with all plugins registered. It is intentionally NOT called directly from
 * this file — call it from `main.ts` (for the server) or from tests (to get
 * a test-scoped Fastify instance without binding to a port).
 *
 * Plugin registration order matters:
 *   1. Infrastructure plugins (sensible, env, logger)
 *   2. Security plugins (helmet, cors, rate-limit, compress)
 *   3. Auth plugins (jwt, oauth2)
 *   4. OpenAPI plugins (swagger, swagger-ui)
 *   5. Application routes
 *   6. Error handler (last — catches all errors from routes)
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import fastifySensible from '@fastify/sensible';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { registerEnvPlugin } from './plugins/env.plugin.js';
import { registerJwtPlugin } from './plugins/jwt.plugin.js';
import { registerPrismaPlugin } from '../database/prisma/prisma.plugin.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerReviewRoutes } from './routes/review.routes.js';
import { registerCharacterRoutes } from './routes/character.routes.js';
import { registerOnboardingRoutes } from './routes/onboarding.routes.js';
import { registerGamificationRoutes } from './routes/gamification.routes.js';
import { registerUserRoutes } from './routes/user.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      ...(process.env['NODE_ENV'] !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => nanoid(10),
    trustProxy: true, // Required behind Traefik
  });

  // ── 1. Infrastructure ────────────────────────────────────────────────────────
  await registerEnvPlugin(app);
  await app.register(fastifySensible);
  await registerPrismaPlugin(app);

  // ── 2. Security ──────────────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'"],
      },
    },
  });

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      const allowed = (app.config.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
      if (!origin || allowed.includes(origin) || allowed.includes('*')) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} is not allowed`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_, context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${context.after}.`,
        requestId: '',
      },
    }),
  });

  await app.register(fastifyCompress, { global: true });
  await app.register(fastifyCookie);

  // ── 3. Auth ──────────────────────────────────────────────────────────────────
  await registerJwtPlugin(app);

  // ── 4. OpenAPI (non-production only) ─────────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    await app.register(fastifySwagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'MemoZi API',
          description:
            'Chinese language learning app with FSRS-5 spaced repetition. ' +
            'Binary review model: HanziWriter determines correctness automatically.',
          version: '1.0.0',
        },
        servers: [{ url: '/api/v1' }],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ BearerAuth: [] }],
      },
    });

    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: false },
    });
  }

  // ── 5. Routes ─────────────────────────────────────────────────────────────────
  await app.register(
    async (api) => {
      await registerHealthRoutes(api);
      await registerAuthRoutes(api);
      await registerReviewRoutes(api);
      await registerCharacterRoutes(api);
      await registerOnboardingRoutes(api);
      await registerGamificationRoutes(api);
      await registerUserRoutes(api);
    },
    { prefix: '/api/v1' },
  );

  // ── 6. Error handler (must be last) ──────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  return app;
}

// Augment Fastify types with config
declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      PORT: number;
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_CALLBACK_URL: string;
      ALLOWED_ORIGINS: string;
      LOG_LEVEL: string;
    };
  }
}
