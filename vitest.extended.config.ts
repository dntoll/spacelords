import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    include: ['tests/integration/**/*.test.ts', 'tests/extended/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
