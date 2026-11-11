import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    // utokad-testsvit: HTTP integration only. Other Vitest tests use vitest.config.ts.
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
