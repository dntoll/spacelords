import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function assertSource(directory, expectedRevision) {
  const branch = git(directory, 'symbolic-ref', '--short', 'HEAD');
  if (branch === 'main' || branch === 'master')
    throw new Error('Use a working branch.');
  if (git(directory, 'status', '--porcelain', '--untracked-files=all'))
    throw new Error('Commit intended changes before deployment.');
  const revision = git(directory, 'rev-parse', 'HEAD');
  if (expectedRevision && revision !== expectedRevision)
    throw new Error('Source revision changed during deployment.');
  return { branch, revision };
}

// bevara-befintlig-webbplats: reject links and unknown public files before copying.
export function files(directory, prefix = '') {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const relative = prefix + entry;
    const path = join(directory, entry);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic link: ${relative}`);
    if (stat.isDirectory()) {
      if (relative !== 'assets')
        throw new Error(`Unexpected directory: ${relative}`);
      found.push(...files(path, `${relative}/`));
    } else {
      if (
        !stat.isFile() ||
        !/^(index\.html|transport-ship\.svg|deployment\.json|assets\/[\w.-]+\.(js|css|webp|svg|png|woff2?))$/.test(
          relative,
        )
      )
        throw new Error(`Unexpected public file: ${relative}`);
      found.push(relative);
    }
  }
  return found.sort();
}

export function manifest(directory) {
  return Object.fromEntries(
    files(directory).map((path) => [
      path,
      createHash('sha256')
        .update(readFileSync(join(directory, path)))
        .digest('hex'),
    ]),
  );
}

export function assertAppDiff(checkout, base, target) {
  const args = target ? [base, target] : ['--cached', base];
  const changed = git(
    checkout,
    'diff',
    '--no-renames',
    '--name-only',
    '-z',
    ...args,
  )
    .split('\0')
    .filter(Boolean);
  if (changed.some((path) => !path.startsWith('spacelords/')))
    throw new Error('Publication changes files outside spacelords/.');
  git(checkout, 'diff', '--check', ...args);
  return changed;
}

function appTree(checkout, revision) {
  return git(checkout, 'ls-tree', revision, '--', 'spacelords');
}

export function preparePublication(checkout, build, sourceRevision) {
  if (git(checkout, 'status', '--porcelain', '--untracked-files=all'))
    throw new Error('Publication checkout must be clean.');
  const base = git(checkout, 'rev-parse', 'HEAD');
  const app = join(checkout, 'spacelords');
  const builtFiles = files(build);
  if (!builtFiles.includes('index.html'))
    throw new Error('Missing built index.html.');
  const appStat = lstatSync(app, { throwIfNoEntry: false });
  if (appStat) {
    if (appStat.isSymbolicLink() || !appStat.isDirectory())
      throw new Error('Unexpected spacelords entry.');
    const previous = files(app);
    if (
      !previous.includes('index.html') ||
      !readFileSync(join(app, 'index.html'), 'utf8').includes(
        '<title>Spacelords</title>',
      )
    )
      throw new Error('Cannot identify the existing Spacelords app.');
  }
  if (
    !readFileSync(join(build, 'index.html'), 'utf8').includes(
      '<title>Spacelords</title>',
    )
  )
    throw new Error('Cannot identify the built app.');
  const hashes = manifest(build);
  rmSync(app, { recursive: true, force: true });
  cpSync(build, app, { recursive: true });
  writeFileSync(
    join(app, 'deployment.json'),
    JSON.stringify({ sourceRevision, files: hashes }, null, 2) + '\n',
  );
  git(checkout, 'add', '--', 'spacelords');
  assertAppDiff(checkout, base);
  const changed = git(checkout, 'diff', '--cached', '--name-only');
  if (changed)
    git(
      checkout,
      'commit',
      '-m',
      `deploy: publish spacelords ${sourceRevision}`,
    );
  return {
    base,
    commit: git(checkout, 'rev-parse', 'HEAD'),
    hashes: manifest(app),
  };
}

export function refreshPublication(checkout, base) {
  git(checkout, 'fetch', 'origin', 'main');
  const current = git(checkout, 'rev-parse', 'origin/main');
  if (appTree(checkout, base) !== appTree(checkout, current))
    throw new Error(
      'spacelords/ changed remotely. Review before deploying again.',
    );
  git(checkout, 'rebase', 'origin/main');
  assertAppDiff(checkout, current, 'HEAD');
  return { previous: current, commit: git(checkout, 'rev-parse', 'HEAD') };
}
