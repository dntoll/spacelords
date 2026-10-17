import express from 'express';
import { resolve } from 'node:path';

const app = express();
app.use('/spacelords', express.static(resolve('dist/pages')));
const server = app.listen(4178, '127.0.0.1', () => {
  console.log('Pages preview: http://127.0.0.1:4178/spacelords/');
});
server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
function shutdown() {
  server.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
