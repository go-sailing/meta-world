import './utils/global-fetch.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { getDb } from './db/index.js';

import { authRoutes } from './modules/auth/route.js';
import { agentRoutes } from './modules/agent/route.js';
import { addressBookRoutes } from './modules/address-book/route.js';
import { memoryRoutes } from './modules/memory/route.js';
import { chatRoutes } from './modules/chat/route.js';
import { letterRoutes } from './modules/letter/route.js';

import { setupGlobalFetch, setupTransformers } from './utils/global-fetch.js';

async function bootstrap() {
  await setupGlobalFetch();
  setupTransformers(config.embedding.hfEndpoint);

  const app = Fastify({ logger: false });

  // 1. 数据库（含迁移）
  getDb();

  // 2. CORS
  await app.register(cors, { origin: true });

  // 3. JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
    verify: { algorithms: ['HS256'] },
  });

  // 4. 全局限流
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => req.ip as string,
  });

  // 5. 错误处理
  app.setErrorHandler((err, _req, reply) => {
    logger.error(err, 'Unhandled error');
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ error: err.message });
  });

  // 6. 注册业务路由
  app.register(authRoutes,        { prefix: '/api' });
  app.register(addressBookRoutes, { prefix: '/api' });
  app.register(agentRoutes,      { prefix: '/api' });
  app.register(memoryRoutes,     { prefix: '/api' });
  app.register(chatRoutes,        { prefix: '/api' });
  app.register(letterRoutes,     { prefix: '/api' });

  app.get('/health', async () => ({ status: 'ok' }));

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port, embeddingMode: config.embedding.mode }, 'Server started');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
