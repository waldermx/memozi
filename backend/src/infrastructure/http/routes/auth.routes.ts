import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../../database/prisma/repositories/UserRepository.js';
import { GamificationRepository } from '../../database/prisma/repositories/GamificationRepository.js';
import { RegisterUser } from '../../../application/auth/RegisterUser.js';
import { LoginUser } from '../../../application/auth/LoginUser.js';
import { RotateRefreshToken } from '../../../application/auth/RotateRefreshToken.js';
import type { AuthResponse } from '@memozi/shared';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(50),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const userRepo = new UserRepository(app.prisma);
  const gamificationRepo = new GamificationRepository(app.prisma);

  /** POST /api/v1/auth/register */
  app.post(
    '/auth/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['Auth'],
        summary: 'Register a new account',
        body: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            displayName: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = RegisterBody.parse(request.body);
      const useCase = new RegisterUser(userRepo, gamificationRepo);
      const user = await useCase.execute(body);

      const accessToken = app.jwt.access.sign({ id: user.id, email: user.email });
      const refreshToken = app.jwt.refresh.sign({ id: user.id });
      const refreshHash = await bcrypt.hash(refreshToken, 12);
      await userRepo.updateRefreshTokenHash(user.id, refreshHash);

      reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions(app));

      const response: AuthResponse = {
        user: toUserDto(user),
        tokens: { accessToken, expiresIn: 900 },
      };
      return reply.code(201).send({ data: response });
    },
  );

  /** POST /api/v1/auth/login */
  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['Auth'], summary: 'Login with email and password' },
    },
    async (request, reply) => {
      const body = LoginBody.parse(request.body);
      const useCase = new LoginUser(userRepo);
      const user = await useCase.execute(body);

      const accessToken = app.jwt.access.sign({ id: user.id, email: user.email });
      const refreshToken = app.jwt.refresh.sign({ id: user.id });
      const refreshHash = await bcrypt.hash(refreshToken, 12);
      await userRepo.updateRefreshTokenHash(user.id, refreshHash);

      reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions(app));

      const response: AuthResponse = {
        user: toUserDto(user),
        tokens: { accessToken, expiresIn: 900 },
      };
      return reply.send({ data: response });
    },
  );

  /** POST /api/v1/auth/refresh */
  app.post(
    '/auth/refresh',
    { schema: { tags: ['Auth'], summary: 'Rotate refresh token' } },
    async (request, reply) => {
      const rawToken =
        request.cookies[REFRESH_COOKIE] ??
        (request.body as { refreshToken?: string } | undefined)?.refreshToken;

      if (!rawToken) {
        return reply.code(401).send({
          error: { code: 'AUTH_INVALID_TOKEN', message: 'No refresh token provided.', requestId: request.id },
        });
      }

      let payload: { id: string };
      try {
        payload = await app.jwt.refresh.verify<{ id: string }>(rawToken);
      } catch {
        return reply.code(401).send({
          error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid refresh token.', requestId: request.id },
        });
      }

      const newRefreshToken = app.jwt.refresh.sign({ id: payload.id });
      const newHash = await bcrypt.hash(newRefreshToken, 12);

      const useCase = new RotateRefreshToken(userRepo);
      const user = await useCase.execute({
        userId: payload.id,
        rawToken,
        newTokenHash: newHash,
      });

      // Re-sign access token with correct email
      const correctAccessToken = app.jwt.access.sign({ id: user.id, email: user.email });

      reply.setCookie(REFRESH_COOKIE, newRefreshToken, cookieOptions(app));
      return reply.send({
        data: { tokens: { accessToken: correctAccessToken, expiresIn: 900 } },
      });
    },
  );

  /** POST /api/v1/auth/logout */
  app.post(
    '/auth/logout',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Auth'], summary: 'Logout and invalidate session' },
    },
    async (request, reply) => {
      await userRepo.updateRefreshTokenHash(request.user.id, null);
      reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      return reply.code(204).send();
    },
  );
}

function cookieOptions(app: FastifyInstance) {
  return {
    httpOnly: true,
    secure: app.config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: REFRESH_TTL_SEC,
  };
}

function toUserDto(user: import('../../../domain/entities/User.js').User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    preferredLocale: user.preferredLocale,
    onboardingCompleted: user.onboardingCompleted,
    startingHSKLevel: user.startingHskLevel as import('@memozi/shared').HSKLevel | null,
  };
}
