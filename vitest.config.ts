import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    // snabb-testsvit: reuse workers within each environment instead of restarting per file.
    isolate: false,
    maxWorkers: 3,
    testTimeout: 2_000,
    hookTimeout: 2_000,
    clearMocks: true,
  },
});
