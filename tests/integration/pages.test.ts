import { once } from 'node:events';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use('/spacelords', express.static(resolve('dist/pages')));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('The static preview did not receive a TCP address.');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server?.listening) {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

describe('pages-underkatalog', () => {
  it('loads the built client and its assets entirely under /spacelords/', async () => {
    const response = await fetch(`${baseUrl}/spacelords/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<title>Spacelords</title>');

    const script = /src="([^"]+\.js)"/.exec(html)?.[1];
    const stylesheet = /href="([^"]+\.css)"/.exec(html)?.[1];

    for (const [path, contentType] of [
      [script, 'javascript'],
      [stylesheet, 'text/css'],
    ] as const) {
      expect(path).toMatch(/^\/spacelords\/assets\//);
      const asset = await fetch(new URL(path ?? '', baseUrl));
      expect(asset.status).toBe(200);
      expect(asset.headers.get('content-type')).toContain(contentType);
      expect((await asset.text()).length).toBeGreaterThan(0);
    }
  });
});
