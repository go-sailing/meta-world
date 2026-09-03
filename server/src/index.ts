import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { getDb } from './db/index.js';
import { agentRoutes } from './modules/agent/route.js';
import { chatRoutes } from './modules/chat/route.js';
import { letterRoutes } from './modules/letter/route.js';

async function bootstrap() {
  const app = Fastify({ logger: false });

  // 初始化数据库（建表 + sqlite-vec）
  getDb();

  // 中间件
  await app.register(cors, { origin: true });

  // 路由
  app.register(agentRoutes, { prefix: '/api' });
  app.register(chatRoutes, { prefix: '/api' });
  app.register(letterRoutes, { prefix: '/api' });

  // health check
  app.get('/health', async () => ({ status: 'ok' }));

  // 全局错误处理
  app.setErrorHandler((err, _req, reply) => {
    logger.error(err, 'Unhandled error');
    // Fastify 校验错误自带正确的 status code（400/422），不要覆盖
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ error: err.message });
  });

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port }, 'Server started');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
