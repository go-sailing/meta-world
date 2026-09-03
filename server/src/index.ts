import './utils/global-fetch.js'; // 最早占位（无副作用）
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { getDb } from './db/index.js';
import { agentRoutes } from './modules/agent/route.js';
import { chatRoutes } from './modules/chat/route.js';
import { letterRoutes } from './modules/letter/route.js';

import { setupGlobalFetch, setupTransformers } from './utils/global-fetch.js';

async function bootstrap() {
  // 1. 应用全局 fetch 代理（undici）
  await setupGlobalFetch();
  setupTransformers(config.embedding.hfEndpoint);

  // 2. 启动 server
  const app = Fastify({ logger: false });

  // 初始化数据库
  getDb();

  await app.register(cors, { origin: true });

  app.register(agentRoutes, { prefix: '/api' });
  app.register(chatRoutes, { prefix: '/api' });
  app.register(letterRoutes, { prefix: '/api' });

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((err, _req, reply) => {
    logger.error(err, 'Unhandled error');
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ error: err.message });
  });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port, embeddingMode: config.embedding.mode }, 'Server started');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
