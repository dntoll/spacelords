import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git } from './publication.mjs';

// integrationsbranch-development: all work starts from and returns to this branch.
export const integrationBranch = 'development';
export const releasedBranch = 'main';
export const passRecordPath = 'dist/checks/full-passed.json';

function succeeds(directory, ...args) {
  try {
    execFileSync('git', ['-C', directory, ...args], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function contains(directory, ancestor, revision = 'HEAD') {
  return succeeds(directory, 'merge-base', '--is-ancestor', ancestor, revision);
}

function remoteRevision(directory, branch) {
  if (
    !succeeds(directory, 'rev-parse', '--verify', `origin/${branch}^{commit}`)
  )
    throw new Error(
      `origin/${branch} is missing. See docs/deployment.md for the branch setup.`,
    );
  return git(directory, 'rev-parse', `origin/${branch}`);
}

function assertClean(directory) {
  if (git(directory, 'status', '--porcelain', '--untracked-files=all'))
    throw new Error('Commit or set aside local changes first.');
}

function currentBranch(directory) {
  return succeeds(directory, 'symbolic-ref', '-q', 'HEAD')
    ? git(directory, 'symbolic-ref', '--short', 'HEAD')
    : null;
}

export function fetchOrigin(directory) {
  git(directory, 'fetch', '--prune', 'origin');
}

export function isRelease(branch) {
  return branch.startsWith('release/');
}

// gemensam-startpunkt: a release builds on main; everything else on development.
export function requiredBase(branch) {
  return isRelease(branch) ? releasedBranch : integrationBranch;
}

export function assertCurrentBase(directory, branch) {
  const base = requiredBase(branch);
  remoteRevision(directory, base);
  if (!contains(directory, `origin/${base}`))
    throw new Error(
      `${branch} lacks the latest origin/${base}. Run "git merge origin/${base}", ` +
        'resolve conflicts, run the quick checks and try again.',
    );
}

export function workStart(directory, name) {
  assertClean(directory);
  fetchOrigin(directory);
  const base = `origin/${integrationBranch}`;
  remoteRevision(directory, integrationBranch);
  if (name) {
    if (!/^[a-z0-9-]+\/[\w.-]+$/.test(name) || isRelease(name))
      throw new Error(
        'Name work branches <agent>/<topic>, e.g. claude/fleet-ui.',
      );
    git(directory, 'switch', '--no-track', '-c', name, base);
    return { branch: name, revision: git(directory, 'rev-parse', 'HEAD') };
  }
  const branch = currentBranch(directory);
  if (!branch || [integrationBranch, releasedBranch].includes(branch))
    throw new Error('Name a work branch: npm run work:start -- claude/<topic>');
  if (contains(directory, 'HEAD', base))
    git(directory, 'merge', '--ff-only', base);
  else if (!contains(directory, base))
    throw new Error(
      `${branch} has commits on an old base. Run "git rebase ${base}" or start a new branch.`,
    );
  return { branch, revision: git(directory, 'rev-parse', 'HEAD') };
}

// integrationsbranch-development: when the work branch contains development, the
// merge commit has exactly the tested tree of the work branch.
export function prepareIntegration(directory, branch) {
  if (branch === integrationBranch || isRelease(branch))
    throw new Error('Run work:merge from a work branch.');
  const development = remoteRevision(directory, integrationBranch);
  assertCurrentBase(directory, branch);
  const head = git(directory, 'rev-parse', 'HEAD');
  if (head === development || contains(directory, 'HEAD', development))
    throw new Error(`${branch} has nothing new for ${integrationBranch}.`);
  const merge = git(
    directory,
    'commit-tree',
    'HEAD^{tree}',
    '-p',
    development,
    '-p',
    head,
    '-m',
    `Merge branch '${branch}' into ${integrationBranch}`,
  );
  return { head, merge, development };
}

function releaseName(directory, date) {
  const stem = `release/${date}`;
  const taken = (name) =>
    succeeds(directory, 'rev-parse', '--verify', `origin/${name}^{commit}`) ||
    succeeds(directory, 'rev-parse', '--verify', `refs/heads/${name}`);
  if (!taken(stem)) return stem;
  for (let index = 2; ; index++)
    if (!taken(`${stem}-${index}`)) return `${stem}-${index}`;
}

// release-till-main: freeze development for the full suite and its fixes.
export function releaseStart(directory, date = new Date()) {
  assertClean(directory);
  fetchOrigin(directory);
  remoteRevision(directory, releasedBranch);
  remoteRevision(directory, integrationBranch);
  if (
    !contains(
      directory,
      `origin/${releasedBranch}`,
      `origin/${integrationBranch}`,
    )
  )
    throw new Error(
      `origin/${integrationBranch} lacks origin/${releasedBranch}. ` +
        'Merge the previous release back first.',
    );
  const name = releaseName(directory, date.toISOString().slice(0, 10));
  git(
    directory,
    'switch',
    '--no-track',
    '-c',
    name,
    `origin/${integrationBranch}`,
  );
  git(directory, 'push', 'origin', `HEAD:refs/heads/${name}`);
  return { branch: name, revision: git(directory, 'rev-parse', 'HEAD') };
}

export function readPassRecord(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// release-till-main: main only moves to a revision whose full suite passed.
export async function releaseFinish(
  directory,
  { passRecord = resolve(directory, passRecordPath), quickCheck } = {},
) {
  const branch = currentBranch(directory);
  if (!branch || !isRelease(branch))
    throw new Error('Run release:finish on a release/ branch.');
  assertClean(directory);
  fetchOrigin(directory);
  const head = git(directory, 'rev-parse', 'HEAD');
  const record = readPassRecord(passRecord);
  if (record?.revision !== head)
    throw new Error(
      `The full suite has not passed for ${head.slice(0, 12)}. Run "npm run check".`,
    );
  remoteRevision(directory, releasedBranch);
  if (!contains(directory, `origin/${releasedBranch}`))
    throw new Error(
      `${branch} lacks origin/${releasedBranch}; main cannot fast-forward.`,
    );
  const development = remoteRevision(directory, integrationBranch);
  if (contains(directory, development)) {
    git(
      directory,
      'push',
      '--atomic',
      'origin',
      `${head}:refs/heads/${releasedBranch}`,
      `${head}:refs/heads/${integrationBranch}`,
    );
  } else {
    git(directory, 'push', 'origin', `${head}:refs/heads/${releasedBranch}`);
    git(directory, 'switch', '--detach', development);
    try {
      git(directory, 'merge', '--no-ff', '--no-edit', branch);
    } catch {
      git(directory, 'merge', '--abort');
      git(directory, 'switch', branch);
      throw new Error(
        `main is now ${head.slice(0, 12)}, but ${branch} conflicts with ` +
          `${integrationBranch}. Run "npm run work:start -- <agent>/merge-${branch.slice(8)}", ` +
          `"git merge ${branch}", resolve, test and run "npm run work:merge".`,
      );
    }
    try {
      await quickCheck?.();
    } catch (error) {
      git(directory, 'switch', branch);
      throw new Error(
        `main is now ${head.slice(0, 12)}, but the merge into ${integrationBranch} ` +
          `failed the quick checks (${error.message}). Merge it on a work branch.`,
        { cause: error },
      );
    }
    git(directory, 'push', 'origin', `HEAD:refs/heads/${integrationBranch}`);
  }
  git(directory, 'push', 'origin', '--delete', branch);
  if (currentBranch(directory) === branch)
    git(directory, 'switch', '--detach', head);
  git(directory, 'branch', '-D', branch);
  return { released: head, development: git(directory, 'rev-parse', 'HEAD') };
}

// branchoversikt: remote branches with commits that development lacks.
export function branchesStatus(directory) {
  fetchOrigin(directory);
  const hasDevelopment = succeeds(
    directory,
    'rev-parse',
    '--verify',
    `origin/${integrationBranch}^{commit}`,
  );
  const target = `origin/${hasDevelopment ? integrationBranch : releasedBranch}`;
  const unmerged = [];
  let merged = 0;
  const refs = git(
    directory,
    'for-each-ref',
    '--sort=-committerdate',
    '--format=%(refname:short)\t%(committerdate:short)\t%(subject)',
    'refs/remotes/origin',
  )
    .split('\n')
    .filter(Boolean);
  for (const line of refs) {
    const [ref, date, subject] = line.split('\t');
    if (
      ref === 'origin' ||
      ref === 'origin/HEAD' ||
      ref === `origin/${releasedBranch}` ||
      ref === `origin/${integrationBranch}`
    )
      continue;
    const ahead = Number(
      git(directory, 'rev-list', '--count', `${target}..${ref}`),
    );
    if (ahead === 0) merged++;
    else unmerged.push({ branch: ref.slice(7), date, ahead, subject });
  }
  const untested = hasDevelopment
    ? Number(
        git(
          directory,
          'rev-list',
          '--count',
          `origin/${releasedBranch}..origin/${integrationBranch}`,
        ),
      )
    : null;
  const mainMerged = hasDevelopment
    ? contains(
        directory,
        `origin/${releasedBranch}`,
        `origin/${integrationBranch}`,
      )
    : null;
  return { target, unmerged, merged, untested, mainMerged };
}

function printStatus(status) {
  console.log(`Compared with ${status.target}.`);
  if (status.untested !== null)
    console.log(
      `development has ${status.untested} commit(s) not yet released to main.`,
    );
  if (status.mainMerged === false)
    console.log(
      'WARNING: development lacks main. Merge the last release back.',
    );
  console.log(`${status.merged} remote branch(es) are fully merged.`);
  if (!status.unmerged.length) return console.log('No unmerged branches.');
  console.log(
    `${status.unmerged.length} remote branch(es) have unmerged commits:`,
  );
  for (const item of status.unmerged)
    console.log(
      `  ${item.date}  ${item.branch}  (+${item.ahead})  ${item.subject}`,
    );
}

async function main([command, argument]) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  process.chdir(root);
  if (command === 'work:start') {
    const result = workStart(root, argument);
    console.log(`On ${result.branch} at ${result.revision.slice(0, 12)}.`);
  } else if (command === 'work:merge') {
    const { deploy } = await import('./deploy-quick.mjs');
    await deploy({ integrate: true });
  } else if (command === 'release:start') {
    const result = releaseStart(root);
    console.log(
      `On ${result.branch} at ${result.revision.slice(0, 12)}. Run "npm run check".`,
    );
  } else if (command === 'release:finish') {
    const { check } = await import('./check.mjs');
    const result = await releaseFinish(root, {
      quickCheck: () => check('quick'),
    });
    console.log(
      `main is ${result.released.slice(0, 12)}; development is ${result.development.slice(0, 12)}.`,
    );
  } else if (command === 'branches:status') {
    printStatus(branchesStatus(root));
  } else {
    throw new Error(
      'Expected work:start, work:merge, release:start, release:finish or branches:status.',
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
