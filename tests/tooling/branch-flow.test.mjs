import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  assertCurrentBase,
  branchesStatus,
  explorationMarker,
  integrationTarget,
  prepareIntegration,
  releaseFinish,
  releaseStart,
  workStart,
} from '../../scripts/branch-flow.mjs';
import { git } from '../../scripts/publication.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'spacelords-branch-flow-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote');
  mkdirSync(remote);
  git(remote, 'init', '--bare', '--initial-branch=main');
  const clone = (name) => {
    const directory = join(root, name);
    git(root, 'clone', '--quiet', remote, directory);
    git(directory, 'config', 'user.name', 'Branch flow test');
    git(directory, 'config', 'user.email', 'branch-flow@example.invalid');
    return directory;
  };
  const commit = (directory, file, content = file) => {
    writeFileSync(join(directory, file), content);
    git(directory, 'add', file);
    git(directory, 'commit', '--quiet', '-m', `Change ${file}`);
    return git(directory, 'rev-parse', 'HEAD');
  };
  const seed = clone('seed');
  commit(seed, 'base.txt');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:refs/heads/main');
  git(seed, 'push', '--quiet', 'origin', 'HEAD:refs/heads/development');
  const remoteRevision = (branch) => git(remote, 'rev-parse', branch);
  return { root, remote, clone, commit, seed, remoteRevision };
}

test('gemensam-startpunkt: new work starts from origin/development', (t) => {
  const { clone, commit, seed, remoteRevision } = fixture(t);
  const other = clone('other');
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  commit(seed, 'feature-a.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  const result = workStart(other, 'claude/fleet-ui');
  assert.equal(result.branch, 'claude/fleet-ui');
  assert.equal(result.revision, remoteRevision('development'));
  assert.throws(() => workStart(other, 'fleet-ui'), /<agent>\/<topic>/);
  assert.throws(() => workStart(other, 'release/x'), /<agent>\/<topic>/);
});

test('gemensam-startpunkt: a fresh worktree branch catches up, local work is kept', (t) => {
  const { clone, commit, seed, remoteRevision } = fixture(t);
  const agent = clone('agent');
  git(agent, 'switch', '--quiet', '-c', 'claude/stale');
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  commit(seed, 'feature-a.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  assert.equal(workStart(agent).revision, remoteRevision('development'));
  const own = commit(agent, 'own.txt');
  assert.equal(workStart(agent).revision, own);
  commit(seed, 'feature-b.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  assert.throws(() => workStart(agent), /old base/);
  writeFileSync(join(agent, 'dirty.txt'), 'dirty');
  assert.throws(() => workStart(agent, 'claude/other'), /local changes/);
});

test('gemensam-startpunkt: work on an old base is not deployed', (t) => {
  const { clone, commit, seed } = fixture(t);
  const agent = clone('agent');
  workStart(agent, 'claude/late');
  commit(agent, 'late.txt');
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  commit(seed, 'other-feature.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  git(agent, 'fetch', '--quiet', 'origin');
  assert.throws(
    () => assertCurrentBase(agent, 'claude/late'),
    /lacks the latest origin\/development/,
  );
  git(agent, 'merge', '--quiet', '--no-edit', 'origin/development');
  assert.doesNotThrow(() => assertCurrentBase(agent, 'claude/late'));
  git(seed, 'push', '--quiet', 'origin', 'development:refs/heads/main');
  git(agent, 'fetch', '--quiet', 'origin');
  git(agent, 'switch', '--quiet', '-c', 'release/2026-11-16', 'HEAD~2');
  assert.throws(
    () => assertCurrentBase(agent, 'release/2026-11-16'),
    /origin\/main/,
  );
});

test('integrationsbranch-development: the merge commit carries the tested tree', (t) => {
  const { clone, commit, remoteRevision } = fixture(t);
  const agent = clone('agent');
  workStart(agent, 'claude/feature');
  assert.throws(
    () => prepareIntegration(agent, 'claude/feature'),
    /nothing new/,
  );
  const head = commit(agent, 'feature.txt');
  const {
    merge,
    target,
    targetRevision: development,
  } = prepareIntegration(agent, 'claude/feature');
  assert.equal(target, 'development');
  assert.equal(development, remoteRevision('development'));
  assert.equal(
    git(agent, 'rev-parse', `${merge}^{tree}`),
    git(agent, 'rev-parse', 'HEAD^{tree}'),
  );
  assert.equal(git(agent, 'rev-parse', `${merge}^1`), development);
  assert.equal(git(agent, 'rev-parse', `${merge}^2`), head);
  assert.throws(() => prepareIntegration(agent, 'development'), /work branch/);
});

test('release-till-main: main moves only to a fully tested release', async (t) => {
  const { root, clone, commit, seed, remoteRevision } = fixture(t);
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  commit(seed, 'feature.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  const cloud = clone('cloud');
  const { branch } = releaseStart(cloud, new Date('2026-11-16T12:00:00Z'));
  assert.equal(branch, 'release/2026-11-16');
  assert.equal(remoteRevision(branch), remoteRevision('development'));
  const fix = commit(cloud, 'fix.txt');
  const passRecord = join(root, 'full-passed.json');
  await assert.rejects(
    releaseFinish(cloud, { passRecord }),
    /full suite has not passed/,
  );
  writeFileSync(passRecord, JSON.stringify({ revision: 'f'.repeat(40) }));
  await assert.rejects(
    releaseFinish(cloud, { passRecord }),
    /full suite has not passed/,
  );
  writeFileSync(passRecord, JSON.stringify({ revision: fix }));
  const result = await releaseFinish(cloud, { passRecord });
  assert.equal(result.released, fix);
  assert.equal(remoteRevision('main'), fix);
  assert.equal(remoteRevision('development'), fix);
  assert.throws(() => remoteRevision(branch));
  const next = releaseStart(cloud, new Date('2026-11-16T15:00:00Z'));
  assert.equal(next.branch, 'release/2026-11-16');
});

test('release-till-main: fixes return to a development that moved on', async (t) => {
  const { root, clone, commit, seed, remoteRevision } = fixture(t);
  const cloud = clone('cloud');
  releaseStart(cloud, new Date('2026-11-16T12:00:00Z'));
  const fix = commit(cloud, 'fix.txt');
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  const feature = commit(seed, 'new-feature.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  const passRecord = join(root, 'full-passed.json');
  writeFileSync(passRecord, JSON.stringify({ revision: fix }));
  let quickChecks = 0;
  await releaseFinish(cloud, { passRecord, quickCheck: () => quickChecks++ });
  assert.equal(quickChecks, 1);
  assert.equal(remoteRevision('main'), fix);
  const development = remoteRevision('development');
  assert.equal(git(cloud, 'rev-parse', `${development}^1`), feature);
  assert.equal(git(cloud, 'rev-parse', `${development}^2`), fix);
});

test('release-till-main: a conflicting merge back is left for a work branch', async (t) => {
  const { root, clone, commit, seed, remoteRevision } = fixture(t);
  const cloud = clone('cloud');
  const { branch } = releaseStart(cloud, new Date('2026-11-16T12:00:00Z'));
  const fix = commit(cloud, 'shared.txt', 'release fix');
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  const feature = commit(seed, 'shared.txt', 'new feature');
  git(seed, 'push', '--quiet', 'origin', 'development');
  const passRecord = join(root, 'full-passed.json');
  writeFileSync(passRecord, JSON.stringify({ revision: fix }));
  await assert.rejects(releaseFinish(cloud, { passRecord }), /conflicts/);
  assert.equal(remoteRevision('main'), fix);
  assert.equal(remoteRevision('development'), feature);
  assert.equal(git(cloud, 'symbolic-ref', '--short', 'HEAD'), branch);
  assert.equal(git(cloud, 'status', '--porcelain'), '');
});

test('branchoversikt: lists remote branches with work development lacks', (t) => {
  const { clone, commit } = fixture(t);
  const agent = clone('agent');
  workStart(agent, 'codex/forgotten');
  commit(agent, 'forgotten.txt');
  git(agent, 'push', '--quiet', 'origin', 'HEAD:refs/heads/codex/forgotten');
  workStart(agent, 'claude/merged');
  git(agent, 'push', '--quiet', 'origin', 'HEAD:refs/heads/claude/merged');
  const status = branchesStatus(agent);
  assert.equal(status.target, 'origin/development');
  assert.deepEqual(
    status.unmerged.map(({ branch, ahead }) => [branch, ahead]),
    [['codex/forgotten', 1]],
  );
  assert.equal(status.merged, 1);
  assert.equal(status.untested, 0);
  assert.equal(status.mainMerged, true);
});

function exploration(t) {
  const setup = fixture(t);
  const { clone, commit } = setup;
  const owner = clone('owner');
  git(
    owner,
    'switch',
    '--quiet',
    '-c',
    'simple_production',
    'origin/development',
  );
  commit(
    owner,
    explorationMarker,
    JSON.stringify({ branch: 'simple_production', purpose: 'Test' }),
  );
  git(owner, 'push', '--quiet', 'origin', 'HEAD:refs/heads/simple_production');
  return { ...setup, owner };
}

test('utforskningsbranch: work branches start from and return to the exploration', (t) => {
  const { clone, commit, remoteRevision } = exploration(t);
  const agent = clone('agent');
  const start = workStart(agent, 'claude/idea', { from: 'simple_production' });
  assert.equal(start.revision, remoteRevision('simple_production'));
  assert.throws(
    () => workStart(agent, 'claude/other', { from: 'main' }),
    /not an exploration branch/,
  );
  const head = commit(agent, 'idea.txt');
  const { merge, target, targetRevision } = prepareIntegration(
    agent,
    'claude/idea',
  );
  assert.equal(target, 'simple_production');
  assert.equal(targetRevision, remoteRevision('simple_production'));
  assert.equal(git(agent, 'rev-parse', `${merge}^1`), targetRevision);
  assert.equal(git(agent, 'rev-parse', `${merge}^2`), head);
  assert.equal(integrationTarget(agent), 'simple_production');
});

test('utforskningsbranch: the exploration never reaches development by itself', (t) => {
  const { clone, commit, owner, seed } = exploration(t);
  commit(owner, 'concept.txt');
  assert.throws(
    () => prepareIntegration(owner, 'simple_production'),
    /exploration branch/,
  );
  // development moving on does not block work inside the exploration.
  git(seed, 'switch', '--quiet', '-c', 'development', 'origin/development');
  commit(seed, 'unrelated.txt');
  git(seed, 'push', '--quiet', 'origin', 'development');
  const agent = clone('agent');
  workStart(agent, 'claude/idea', { from: 'simple_production' });
  commit(agent, 'idea.txt');
  assert.doesNotThrow(() => assertCurrentBase(agent, 'claude/idea'));
  // Removing the marker on a work branch is the explicit decision to merge.
  git(agent, 'rm', '--quiet', explorationMarker);
  git(agent, 'commit', '--quiet', '-m', 'End exploration');
  assert.equal(integrationTarget(agent), 'development');
  assert.throws(
    () => prepareIntegration(agent, 'claude/idea'),
    /lacks the latest origin\/development/,
  );
  git(agent, 'merge', '--quiet', '--no-edit', 'origin/development');
  assert.equal(prepareIntegration(agent, 'claude/idea').target, 'development');
});

test('utforskningsbranch: branch status lists explorations apart', (t) => {
  const { clone, commit } = exploration(t);
  const agent = clone('agent');
  workStart(agent, 'claude/idea', { from: 'simple_production' });
  git(agent, 'push', '--quiet', 'origin', 'HEAD:refs/heads/claude/idea');
  commit(agent, 'idea.txt');
  git(agent, 'push', '--quiet', 'origin', 'HEAD:refs/heads/claude/pending');
  const status = branchesStatus(agent);
  assert.deepEqual(
    status.explorations.map(({ branch, ahead }) => [branch, ahead]),
    [['simple_production', 1]],
  );
  assert.deepEqual(
    status.unmerged.map(({ branch, ahead, target }) => [branch, ahead, target]),
    [['claude/pending', 1, 'origin/simple_production']],
  );
  assert.equal(status.merged, 1);
});
