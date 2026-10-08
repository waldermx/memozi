/**
 * @file src/main.ts
 * @description Application entry point.
 *
 * Responsibilities:
 *   1. Create the Fastify application.
 *   2. Bind to the configured PORT.
 *   3. Handle graceful shutdown on SIGTERM and SIGINT.
 *
 * This file is intentionally thin. All business logic lives in domain/,
 * application/, and infrastructure/. Never add business logic here.
 */

import { createApp } from './infrastructure/http/app.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function main(): Promise<void> {
  const app = await createApp();

  // Graceful shutdown handler
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Received shutdown signal — stopping gracefully');
    try {
      await app.close();
      app.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, host: HOST }, `MemoZi API listening`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
