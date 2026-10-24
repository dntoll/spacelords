import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { check, runSteps } from './check.mjs';
import {
  assertSource,
  git,
  manifest,
  preparePublication,
  refreshPublication,
} from './publication.mjs';

const site = 'https://curiousengineerstudio.se';
const appURL = `${site}/spacelords/`;
const repository = 'dntoll/dntoll.github.io';

async function request(url) {
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response;
}

async function checksum(url) {
  return createHash('sha256')
    .update(Buffer.from(await (await request(url)).arrayBuffer()))
    .digest('hex');
}

async function waitForPages(revision, report) {
  const deadline = Date.now() + 12 * 60_000;
  let lastStatus;
  while (Date.now() < deadline) {
    const data = await (
      await request(
        `https://api.github.com/repos/${repository}/actions/runs?head_sha=${revision}&per_page=30`,
      )
    ).json();
    const run = data.workflow_runs.find(
      (item) => item.name === 'pages build and deployment',
    );
    if (run) {
      report.pagesRun = run.html_url;
      if (run.status !== lastStatus) {
        console.log(`Pages: ${run.status}. ${run.html_url}`);
        lastStatus = run.status;
      }
      if (run.status === 'completed') {
        if (run.conclusion !== 'success')
          throw new Error(`Pages ${run.conclusion}. See ${run.html_url}`);
        return;
      }
    }
    await setTimeout(15_000);
  }
  throw new Error(
    'Timed out waiting for Pages. Publication may still be in progress.',
  );
}

async function verifyLive(hashes) {
  for (const [path, hash] of Object.entries(hashes)) {
    const url = `${appURL}${path}?verify=${hash.slice(0, 12)}`;
    if ((await checksum(url)) !== hash)
      throw new Error(`Published bytes differ: ${path}`);
    const type = (await request(url)).headers.get('content-type') ?? '';
    if (
      (path.endsWith('.js') && !type.includes('javascript')) ||
      (path.endsWith('.css') && !type.includes('text/css')) ||
      (path.endsWith('.html') && !type.includes('text/html'))
    )
      throw new Error(`Unexpected content type: ${path}`);
  }
  const redirect = await request(`${site}/spacelords`);
  if (redirect.url !== appURL) throw new Error('Unexpected app redirect.');
}

export async function deploy() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  process.chdir(root);
  const started = performance.now();
  const source = assertSource(root);
  const directory = resolve(
    'dist/deployments',
    `${source.revision.slice(0, 12)}-${Date.now()}`,
  );
  mkdirSync(directory, { recursive: true });
  const report = {
    sourceRevision: source.revision,
    branch: source.branch,
    url: appURL,
    status: 'started',
    operations: [],
  };
  const save = () =>
    writeFileSync(
      join(directory, 'report.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
  save();
  console.log(`Deployment report: ${join(directory, 'report.json')}`);
  try {
    report.checks = check('quick');
    assertSource(root, source.revision);
    const work = mkdtempSync(join(tmpdir(), 'spacelords-deploy-'));
    report.checkout = join(work, 'site');
    const build = join(work, 'build');
    cpSync(resolve('dist/pages'), build, { recursive: true });
    const builtHashes = manifest(build);
    const before = {};
    for (const path of [
      '/',
      '/MachineBloom/',
      '/Defence-Grid/test/',
      '/styles.css',
      '/i18n.js',
    ])
      before[path] = await checksum(`${site}${path}`);
    report.operations.push(
      ...runSteps(
        [
          [
            'push-source',
            'git',
            [
              'push',
              'git@github.com:dntoll/spacelords.git',
              `${source.revision}:refs/heads/${source.branch}`,
            ],
          ],
          [
            'clone-site',
            'git',
            [
              'clone',
              '--branch',
              'main',
              '--single-branch',
              `https://github.com/${repository}.git`,
              report.checkout,
            ],
          ],
        ],
        directory,
      ),
    );
    git(
      report.checkout,
      'switch',
      '-c',
      `codex/deploy-spacelords-${source.revision.slice(0, 12)}`,
    );
    // The approved local workflow uses the documented ordinary-push fallback.
    git(
      report.checkout,
      'remote',
      'set-url',
      '--push',
      'origin',
      `git@github.com:${repository}.git`,
    );
    const publication = preparePublication(
      report.checkout,
      build,
      source.revision,
    );
    const current = refreshPublication(report.checkout, publication.base);
    report.previousRevision = current.previous;
    report.deployRevision = current.commit;
    report.files = publication.hashes;
    report.status = 'prepared';
    save();
    assertSource(root, source.revision);
    if (JSON.stringify(manifest(build)) !== JSON.stringify(builtHashes))
      throw new Error('Build changed during deployment.');
    report.status = 'publishing';
    save();
    report.operations.push(
      ...runSteps(
        [
          [
            'publish',
            'git',
            ['-C', report.checkout, 'push', 'origin', 'HEAD:refs/heads/main'],
          ],
        ],
        directory,
      ),
    );
    report.status = 'published-awaiting-verification';
    save();
    await waitForPages(current.commit, report);
    await verifyLive(publication.hashes);
    for (const [path, hash] of Object.entries(before)) {
      if ((await checksum(`${site}${path}`)) !== hash)
        throw new Error(
          `Existing website changed: ${path}. Inspect concurrent publications.`,
        );
    }
    const previousURL = process.env.SPACELORDS_SMOKE_URL;
    process.env.SPACELORDS_SMOKE_URL = appURL;
    try {
      report.operations.push(
        ...runSteps(
          [['live-mobile', 'npm', ['run', 'test:mobile']]],
          directory,
        ),
      );
    } finally {
      if (previousURL === undefined) delete process.env.SPACELORDS_SMOKE_URL;
      else process.env.SPACELORDS_SMOKE_URL = previousURL;
    }
    report.status = 'verified';
    console.log(`Published ${source.revision.slice(0, 12)}: ${appURL}`);
  } catch (error) {
    report.failure = error.message;
    if (
      !['publishing', 'published-awaiting-verification'].includes(report.status)
    )
      report.status = 'failed';
    throw error;
  } finally {
    report.seconds = Number(((performance.now() - started) / 1_000).toFixed(2));
    save();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  deploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
