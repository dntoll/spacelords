import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let server: ChildProcess;
let baseUrl: string;

beforeAll(async () => {
  server = spawn(process.execPath, ['dist/server/main.js'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  baseUrl = await new Promise<string>((resolve, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start: ${output}\n${errors}`));
    }, 10_000);
    server.stderr?.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
    });
    server.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const address = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0];
      if (address) {
        clearTimeout(timeout);
        resolve(address);
      }
    });
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited (${String(code)}): ${errors}`));
    });
  });
});

afterAll(async () => {
  if (server?.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
});

describe('serverstatus', () => {
  it('serves health as JSON through the built server', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('does not return the client page for unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/unknown`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });
});

describe('produktionsstart', () => {
  it('serves the built page and its executable client assets', async () => {
    const response = await fetch(baseUrl);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('<title>Spacelords</title>');
    expect(html).toContain('id="app"');

    const script = /src="([^"]+\.js)"/.exec(html)?.[1];
    const stylesheet = /href="([^"]+\.css)"/.exec(html)?.[1];
    expect(script).toBeDefined();
    expect(stylesheet).toBeDefined();

    for (const [path, contentType] of [
      [script, 'javascript'],
      [stylesheet, 'text/css'],
    ] as const) {
      const asset = await fetch(new URL(path ?? '', baseUrl));
      expect(asset.status).toBe(200);
      expect(asset.headers.get('content-type')).toContain(contentType);
      expect((await asset.text()).length).toBeGreaterThan(0);
    }
  });

  it('returns 404 for missing files instead of HTML with a successful status', async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`);
    expect(response.status).toBe(404);
  });
});
