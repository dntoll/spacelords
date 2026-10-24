import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  assertAppDiff,
  assertSource,
  git,
  manifest,
  preparePublication,
  refreshPublication,
} from '../../scripts/publication.mjs';
import { runSteps } from '../../scripts/check.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'spacelords-publication-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote');
  mkdirSync(remote);
  git(remote, 'init', '--bare', '--initial-branch=main');
  const checkout = join(root, 'checkout');
  git(root, 'clone', remote, checkout);
  git(checkout, 'config', 'user.name', 'Publication test');
  git(checkout, 'config', 'user.email', 'publication@example.invalid');
  const write = (path, content) => {
    mkdirSync(join(checkout, path, '..'), { recursive: true });
    writeFileSync(join(checkout, path), content);
  };
  write('index.html', 'Existing site');
  write('CNAME', 'example.invalid');
  write('MachineBloom/index.html', 'Other app');
  write('spacelords/index.html', '<title>Spacelords</title>old');
  write('spacelords/assets/old.js', 'old');
  git(checkout, 'add', '.');
  git(checkout, 'commit', '-m', 'Initial website');
  git(checkout, 'push', 'origin', 'main');
  git(checkout, 'switch', '-c', 'codex/test-publication');
  const build = join(root, 'build');
  mkdirSync(join(build, 'assets'), { recursive: true });
  writeFileSync(join(build, 'index.html'), '<title>Spacelords</title>new');
  writeFileSync(join(build, 'assets/new.js'), 'new');
  return { root, remote, checkout, build, write };
}

test('snabb-mobilpublicering: refuses main, dirty sources and a changed revision', (t) => {
  const { checkout, write } = fixture(t);
  const source = assertSource(checkout);
  assert.throws(
    () => assertSource(checkout, '0'.repeat(40)),
    /revision changed/,
  );
  git(checkout, 'switch', 'main');
  assert.throws(() => assertSource(checkout), /working branch/);
  git(checkout, 'switch', source.branch);
  write('uncommitted.txt', 'Do not publish');
  assert.throws(() => assertSource(checkout), /Commit intended changes/);
});

test('snabb-mobilpublicering / bevara-befintlig-webbplats: replaces only the app and records the source', (t) => {
  const { checkout, build } = fixture(t);
  const { base, commit, hashes } = preparePublication(
    checkout,
    build,
    'a'.repeat(40),
  );
  const changed = assertAppDiff(checkout, base, commit);
  assert.ok(changed.includes('spacelords/assets/old.js'));
  assert.ok(changed.includes('spacelords/assets/new.js'));
  assert.equal(
    readFileSync(join(checkout, 'index.html'), 'utf8'),
    'Existing site',
  );
  assert.equal(
    readFileSync(join(checkout, 'CNAME'), 'utf8'),
    'example.invalid',
  );
  assert.equal(
    readFileSync(join(checkout, 'MachineBloom/index.html'), 'utf8'),
    'Other app',
  );
  assert.equal(
    JSON.parse(
      readFileSync(join(checkout, 'spacelords/deployment.json'), 'utf8'),
    ).sourceRevision,
    'a'.repeat(40),
  );
  assert.deepEqual(hashes, manifest(join(checkout, 'spacelords')));
});

test('bevara-befintlig-webbplats: rejects symbolic links, unknown files and unrecognized apps', (t) => {
  const { checkout, build, write } = fixture(t);
  symlinkSync(join(checkout, 'CNAME'), join(build, 'assets/leak.js'));
  assert.throws(
    () => preparePublication(checkout, build, 'revision'),
    /Symbolic link/,
  );
  rmSync(join(build, 'assets/leak.js'));
  writeFileSync(join(build, '.env'), 'not-public');
  assert.throws(
    () => preparePublication(checkout, build, 'revision'),
    /Unexpected public file/,
  );
  rmSync(join(build, '.env'));
  write('spacelords/index.html', 'Some other app');
  git(checkout, 'add', '.');
  git(checkout, 'commit', '-m', 'Other app');
  assert.throws(
    () => preparePublication(checkout, build, 'revision'),
    /identify the existing/,
  );
});

test('bevara-befintlig-webbplats: rejects a diff outside the publication directory', (t) => {
  const { checkout, write } = fixture(t);
  const base = git(checkout, 'rev-parse', 'HEAD');
  write('CNAME', 'changed.invalid');
  git(checkout, 'add', 'CNAME');
  assert.throws(() => assertAppDiff(checkout, base), /outside spacelords/);
});

test('bevara-befintlig-webbplats: refuses a linked app directory without changing its target', (t) => {
  const { checkout, build } = fixture(t);
  const target = join(checkout, 'MachineBloom');
  rmSync(join(checkout, 'spacelords'), { recursive: true });
  symlinkSync(target, join(checkout, 'spacelords'));
  git(checkout, 'add', 'spacelords');
  git(checkout, 'commit', '-m', 'Linked app directory');
  assert.throws(
    () => preparePublication(checkout, build, 'revision'),
    /Unexpected spacelords entry/,
  );
  assert.equal(readFileSync(join(target, 'index.html'), 'utf8'), 'Other app');
});

function concurrentCheckout(root, remote) {
  const other = join(root, 'other');
  git(root, 'clone', remote, other);
  git(other, 'config', 'user.name', 'Other publisher');
  git(other, 'config', 'user.email', 'other@example.invalid');
  return other;
}

test('bevara-befintlig-webbplats: retains concurrent changes to other apps', (t) => {
  const { root, remote, checkout, build } = fixture(t);
  const { base } = preparePublication(checkout, build, 'revision');
  const other = concurrentCheckout(root, remote);
  writeFileSync(join(other, 'MachineBloom/index.html'), 'Updated other app');
  git(other, 'commit', '-am', 'Other publication');
  git(other, 'push', 'origin', 'main');
  const { previous, commit } = refreshPublication(checkout, base);
  assert.equal(
    readFileSync(join(checkout, 'MachineBloom/index.html'), 'utf8'),
    'Updated other app',
  );
  assertAppDiff(checkout, previous, commit);
  git(checkout, 'push', 'origin', 'HEAD:main');
});

test('bevara-befintlig-webbplats: aborts when another publisher changed spacelords', (t) => {
  const { root, remote, checkout, build } = fixture(t);
  const { base } = preparePublication(checkout, build, 'revision');
  const other = concurrentCheckout(root, remote);
  writeFileSync(join(other, 'spacelords/index.html'), 'Concurrent app update');
  git(other, 'commit', '-am', 'Concurrent Spacelords');
  git(other, 'push', 'origin', 'main');
  assert.throws(() => refreshPublication(checkout, base), /changed remotely/);
  assert.throws(() => git(checkout, 'push', 'origin', 'HEAD:main'));
  assert.equal(
    git(other, 'rev-parse', 'HEAD'),
    git(remote, 'rev-parse', 'main'),
  );
});

test('snabb-mobilpublicering: a failed check prevents later steps', (t) => {
  const { root } = fixture(t);
  const marker = join(root, 'must-not-exist');
  assert.throws(
    () =>
      runSteps(
        [
          ['failure', process.execPath, ['-e', 'process.exit(1)']],
          [
            'publication',
            process.execPath,
            ['-e', 'throw new Error("Must not run")'],
          ],
        ],
        join(root, 'logs'),
      ),
    /failure failed/,
  );
  assert.throws(() => readFileSync(marker));
  assert.throws(() => readFileSync(join(root, 'logs/publication.log')));
});
