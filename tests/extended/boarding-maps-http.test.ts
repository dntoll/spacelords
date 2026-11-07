import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import pirateMap from '../../src/client/maps/pirate-boarding.txt?raw';
import { createApp } from '../../src/server/app.js';

const directory = mkdtempSync(path.join(tmpdir(), 'spacelords-maps-http-'));
writeFileSync(path.join(directory, 'pirate-boarding.txt'), pirateMap);
const app = createApp(directory, directory);
let server: Server;

function url(pathname: string): string {
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}${pathname}`;
}

beforeAll(async () => {
  server = app.listen(0, '127.0.0.1');
  if (!server.listening) await once(server, 'listening');
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  rmSync(directory, { recursive: true, force: true });
});

describe('lokal-bordningskarteditor', () => {
  it('serves and overwrites a boarding map over HTTP', async () => {
    const list = await fetch(url('/api/boarding-maps'));
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({
      maps: [{ id: 'pirate', name: 'Space pirate' }],
    });

    const missing = await fetch(url('/api/boarding-maps/missing'));
    expect(missing.status).toBe(404);

    const written = await fetch(url('/api/boarding-maps/pirate'), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: pirateMap.replace('name=Space pirate', 'name=Edited pirate'),
      }),
    });
    expect(written.status).toBe(200);
    expect(
      readFileSync(path.join(directory, 'pirate-boarding.txt'), 'utf8'),
    ).toContain('name=Edited pirate');
    expect(
      readFileSync(path.join(directory, 'pirate-boarding.txt'), 'utf8'),
    ).toContain('[lights]');
  });
});
