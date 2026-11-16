import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

function gitOutput(...args: string[]): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

// synlig-byggversion: the deployment scripts may name the published branch and
// revision, for example development and its merge commit, when the tree is the same.
function buildInfo(): string {
  const branch =
    process.env.SPACELORDS_BUILD_BRANCH ||
    gitOutput('symbolic-ref', '--short', 'HEAD') ||
    'detached';
  const revision =
    process.env.SPACELORDS_BUILD_REVISION || gitOutput('rev-parse', 'HEAD');
  const localChanges =
    !process.env.SPACELORDS_BUILD_REVISION &&
    gitOutput('status', '--porcelain') !== '';
  return JSON.stringify({
    branch,
    revision,
    builtAt: new Date().toISOString(),
    localChanges,
  });
}

export default defineConfig({
  root: 'src/client',
  define: {
    'import.meta.env.VITE_SPACELORDS_BUILD': JSON.stringify(buildInfo()),
  },
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
