import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('snabb-mobilpublicering: the mobile CLI selects exactly the two phone profiles', () => {
  const output = execFileSync(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      '--config',
      'playwright.mobile.config.ts',
      '--list',
    ],
    { encoding: 'utf8' },
  );
  assert.match(output, /phone-chromium/);
  assert.match(output, /phone-webkit/);
  assert.doesNotMatch(output, /desktop-chromium|tablet-webkit/);
  assert.match(output, /mobile-smoke\.spec\.ts/);
  assert.match(output, /tactical-combat\.spec\.ts/);
  assert.match(output, /Total: 8 tests in 2 files/);
});
