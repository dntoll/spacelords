import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runSteps } from '../../scripts/check.mjs';

test('utokad-testsvit: launches npm through its CLI on Windows and Unix', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'spacelords-check-runner-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const [result] = runSteps([['npm-version', 'npm', ['--version']]], directory);
  assert.equal(result.passed, true);
  assert.match(readFileSync(result.log, 'utf8').trim(), /^\d+\.\d+\.\d+$/);
});
