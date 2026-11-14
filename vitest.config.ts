import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts'],
    // snabb-testsvit: every Vitest file except HTTP integration. No total time budget.
    include: [
      'tests/unit/**/*.test.ts',
      'tests/extended/**/*.test.ts',
      'tests/boarding/unit/**/*.test.ts',
      'tests/boarding/extended/**/*.test.ts',
      'tests/space-battle/unit/**/*.test.ts',
      'tests/space-battle/extended/**/*.test.ts',
    ],
    environment: 'node',
    pool: 'threads',
    // snabb-testsvit: reuse workers within each environment instead of restarting per file.
    isolate: false,
    maxWorkers: 4,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    clearMocks: true,
  },
});
