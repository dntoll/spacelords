import { spawn, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// utokad-testsvit: the CI job stays at 20 minutes. A single browser case does not.
export const stepTimeoutMs = 20 * 60_000;

export function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // The process has already exited.
    }
  }
}

function launch(command, args, descriptor) {
  // utokad-testsvit: npm is a .cmd launcher on Windows, not an executable.
  const npmCli =
    process.env.npm_execpath ??
    resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const useNpmCli = command === 'npm' && process.platform === 'win32';
  return spawn(
    useNpmCli ? process.execPath : command,
    useNpmCli ? [npmCli, ...args] : args,
    {
      stdio: ['ignore', descriptor, descriptor],
      windowsHide: true,
      detached: process.platform !== 'win32',
    },
  );
}

function waitForStep(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let fallback;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(fallback);
      resolve(result);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
      fallback = setTimeout(() => {
        finish({
          error: Object.assign(new Error('The operation timed out.'), {
            code: 'ETIMEDOUT',
          }),
          status: null,
          signal: null,
        });
      }, 2_000);
    }, timeoutMs);
    child.once('error', (error) =>
      finish({ error, status: null, signal: null }),
    );
    child.once('close', (status, signal) =>
      finish({
        error: timedOut
          ? Object.assign(new Error('The operation timed out.'), {
              code: 'ETIMEDOUT',
            })
          : null,
        status: timedOut ? null : status,
        signal,
      }),
    );
  });
}

export async function runSteps(steps, directory, timeoutMs = stepTimeoutMs) {
  mkdirSync(directory, { recursive: true });
  const results = [];
  for (const [name, command, args] of steps) {
    const log = resolve(directory, `${name}.log`);
    const descriptor = openSync(log, 'w');
    const started = performance.now();
    let result;
    try {
      result = await waitForStep(launch(command, args, descriptor), timeoutMs);
    } finally {
      closeSync(descriptor);
    }
    const seconds = Number(((performance.now() - started) / 1_000).toFixed(2));
    const passed = !result.error && result.status === 0;
    if (result.error) appendFileSync(log, `${result.error.message}\n`);
    results.push({ name, passed, seconds, log });
    writeFileSync(
      resolve(directory, 'steps.json'),
      JSON.stringify(results, null, 2),
    );
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name} (${seconds}s)`);
    if (!passed) throw new Error(`${name} failed. See ${log}`);
  }
  return results;
}

export async function check(profile) {
  if (process.env.SPACELORDS_SMOKE_URL)
    throw new Error(
      'Checks must use the local build. Unset SPACELORDS_SMOKE_URL.',
    );
  if (!['quick', 'full', 'extended'].includes(profile))
    throw new Error('Expected quick, full or extended.');
  const npm = (name) => [name.replaceAll(':', '-'), 'npm', ['run', name]];
  const steps = [];
  if (profile !== 'extended') {
    steps.push(...['format:check', 'lint', 'test:fast'].map(npm));
  }
  steps.push(npm('typecheck'));
  if (profile !== 'quick') steps.push(npm('build:artifacts'));
  steps.push(npm('build:pages:artifacts'), npm('test:tooling'));
  if (profile === 'quick') {
    // snabb-mobilpublicering: Playwright stays in the extended suite.
    steps.push(npm('test:pages'));
  } else {
    steps.push(
      [
        'integration',
        'node',
        [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--config',
          'vitest.extended.config.ts',
        ],
      ],
      npm('test:browser'),
    );
  }
  const directory = resolve('dist/checks', `${profile}-${Date.now()}`);
  console.log(`Checks: ${profile}. Logs: ${directory}`);
  return { profile, steps: await runSteps(steps, directory), directory };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await check(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
