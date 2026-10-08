import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Iter 2: Cover the domain service layer (SRS value objects now live in shared).
      // Entity coverage increases in Iter 3 (repositories) and Iter 4 (use cases).
      include: ['src/domain/services/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
    alias: {
      '@memozi/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  resolve: {
    alias: {
      '@memozi/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
