import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

// snabb-testsvit: the budget covers startup and the entire suite, not each test.
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
  { stdio: 'inherit', timeout: 20_000, killSignal: 'SIGKILL' },
);
const elapsed = performance.now() - started;

if (result.error || elapsed > 20_000) {
  console.error(
    'snabb-testsvit: failed or exceeded the total 20 second budget.',
  );
  if (result.error) {
    console.error(result.error.message);
  }
  process.exitCode = 1;
} else {
  console.log(`snabb-testsvit: ${(elapsed / 1_000).toFixed(2)} s / 20 s`);
  process.exitCode = result.status ?? 1;
}
