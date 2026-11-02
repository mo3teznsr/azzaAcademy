import { serve } from '@hono/node-server';
import type { Server as HttpServer } from 'node:http';
import { createApp } from './app';
import { createContainer } from './container';
import { loadConfig } from './core/config';
import { JobScheduler } from './jobs/scheduler';
import { attachSocketServer } from './realtime/socket-server';

const config = loadConfig();
const container = createContainer(config);
const app = createApp(container);

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.info(`Azza API on http://localhost:${info.port}`);
});

attachSocketServer(server as HttpServer, container);

const scheduler = new JobScheduler(container.jobs);
scheduler.start();

const shutdown = async () => {
  scheduler.stop();
  server.close();
  await container.adapters.db.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
