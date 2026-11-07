import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be an integer between 0 and 65535.');
}

function resolveMapsDirectory(): string {
  if (process.env.BOARDING_MAPS_DIR) return process.env.BOARDING_MAPS_DIR;
  const candidates = [
    fileURLToPath(new URL('../client/maps/', import.meta.url)),
    fileURLToPath(new URL('../../src/client/maps/', import.meta.url)),
  ];
  return (
    candidates.find((directory) =>
      existsSync(path.join(directory, 'pirate-boarding.txt')),
    ) ?? candidates[0]!
  );
}

const app = createApp(
  fileURLToPath(new URL('../client/', import.meta.url)),
  resolveMapsDirectory(),
);
const server = app.listen(port, host, () => {
  const address = server.address();
  if (address && typeof address !== 'string') {
    console.log(`Spacelords listening at http://${host}:${address.port}`);
  }
});

server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

function shutdown(): void {
  server.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
