import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runSteps } from '../../scripts/check.mjs';

test('utokad-testsvit: launches npm through its CLI on Windows and Unix', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'spacelords-check-runner-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const [result] = await runSteps(
    [['npm-version', 'npm', ['--version']]],
    directory,
  );
  assert.equal(result.passed, true);
  assert.match(readFileSync(result.log, 'utf8').trim(), /^\d+\.\d+\.\d+$/);
});

test('utokad-testsvit: a timed-out step stops descendant processes', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'spacelords-check-timeout-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const marker = join(directory, 'grandchild.txt');
  const script = join(directory, 'hang.mjs');
  writeFileSync(
    script,
    `import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
writeFileSync(${JSON.stringify(marker)}, String(child.pid));
setInterval(() => {}, 1000);
`,
  );
  await assert.rejects(
    () => runSteps([['hang', process.execPath, [script]]], directory, 1_000),
    /hang failed/,
  );
  const pid = Number(readFileSync(marker, 'utf8'));
  assert.equal(alive(pid), false);
  assert.match(readFileSync(join(directory, 'hang.log'), 'utf8'), /timed out/);
});

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
