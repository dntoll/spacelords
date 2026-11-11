import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

// snabb-testsvit: the suite has no total time budget.
const started = performance.now();
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
    ),
    'run',
    '--config',
    'vitest.config.ts',
  ],
  { stdio: 'inherit' },
);
const elapsed = performance.now() - started;

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  console.log(`snabb-testsvit: ${(elapsed / 1_000).toFixed(2)} s`);
  process.exitCode = result.status ?? 1;
}
