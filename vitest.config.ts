import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    maxWorkers: 2,
    testTimeout: 2_000,
    hookTimeout: 2_000,
    clearMocks: true,
  },
});
