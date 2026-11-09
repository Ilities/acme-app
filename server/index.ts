import { createApp } from './app.js';
import { config } from './config.js';
import { sqlite } from './db/client.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.info(`Acme Book API listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    sqlite.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
