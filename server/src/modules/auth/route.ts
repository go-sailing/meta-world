import type { FastifyInstance } from 'fastify';
import { authService } from './service.js';
import { verifyAuth, getAuthUser } from '../../middleware/index.js';

const registerBody = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 128 },
    password: { type: 'string', minLength: 8, maxLength: 32 },
  },
} as const;

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post(
    '/auth/register',
    {
      preHandler: app.rateLimit({ max: 10, timeWindow: 60 * 1000 }),
      schema: { body: registerBody } as any,
    },
    async (req, reply) => {
      try {
        const result = await authService.register(req.body as { email: string; password: string });
        reply.code(201).send(result);
      } catch (err: any) {
        if (err.code === 'EMAIL_EXISTS') {
          return reply.code(409).send({ error: 'EMAIL_EXISTS', message: '该邮箱已注册' });
        }
        if (err.code === 'INVALID_EMAIL') {
          return reply.code(400).send({ error: 'INVALID_EMAIL', message: err.message });
        }
        if (err.code === 'INVALID_PASSWORD') {
          return reply.code(400).send({ error: 'INVALID_PASSWORD', message: err.message });
        }
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // POST /api/auth/login
  app.post(
    '/auth/login',
    {
      preHandler: app.rateLimit({ max: 20, timeWindow: 60 * 1000 }),
      schema: { body: registerBody } as any,
    },
    async (req, reply) => {
      try {
        const result = await authService.login(
          req.body as { email: string; password: string },
          (payload, opts) => app.jwt.sign(payload as any, opts as any)
        );
        reply.send(result);
      } catch (err: any) {
        if (err.code === 'INVALID_CREDENTIALS') {
          return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' });
        }
        reply.code(500).send({ error: err.message });
      }
    }
  );

  // GET /api/auth/me
  app.get('/auth/me', { preHandler: [verifyAuth] }, async (req, reply) => {
    const user = getAuthUser(req);
    reply.send({ user_id: user.sub, email: user.email });
  });
}
