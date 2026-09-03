import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { letterService } from './service.js';

export async function letterRoutes(app: FastifyInstance) {
  // POST /api/mail/send — 发送信件
  app.post(
    '/mail/send',
    {
      schema: {
        body: z.object({
          from_agent_id: z.string().uuid(),
          to_agent_id: z.string().uuid(),
          subject: z.string().max(50).optional(),
          body: z.string().max(2000),
        }),
      },
    },
    async (req, reply) => {
      try {
        const id = await letterService.send(req.body as any);
        reply.status(201).send({ letter_id: id, status: 'sent' });
      } catch (err: any) {
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // GET /api/mail/inbox?agent_id=xxx — 信件箱列表
  app.get('/mail/inbox', async (req, reply) => {
    const { agent_id } = req.query as { agent_id: string };
    if (!agent_id) return reply.code(400).send({ error: 'agent_id required' });
    reply.send(letterService.listInbox(agent_id));
  });

  // GET /api/mail/:id — 信件详情（同时标记已读）
  app.get('/mail/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const letter = letterService.read(id);
    if (!letter) return reply.code(404).send({ error: 'Letter not found' });
    reply.send(letter);
  });

  // POST /api/mail/:id/reprocess — 手动重新处理失败信件
  app.post('/mail/:id/reprocess', async (req, reply) => {
    const { id } = req.params as { id: string };
    letterService.reprocess(id);
    reply.send({ ok: true });
  });
}
