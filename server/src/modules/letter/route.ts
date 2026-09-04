import type { FastifyInstance } from 'fastify';
import { letterService } from './service.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { letterRepo } from '../../db/repositories/letter.repo.js';
import { verifyAuth, verifyAgentOwnership, getAuthUser } from '../../middleware/index.js';

const sendLetterBody = {
  type: 'object',
  required: ['from_agent_id', 'to_agent_id', 'body'],
  properties: {
    from_agent_id: { type: 'string' },
    to_agent_id: { type: 'string' },
    subject: { type: 'string', maxLength: 50 },
    body: { type: 'string', maxLength: 2000 },
  },
} as const;

export async function letterRoutes(app: FastifyInstance) {
  // POST /api/mail/send
  app.post(
    '/mail/send',
    {
      preHandler: [verifyAuth, verifyAgentOwnership],
      schema: { body: sendLetterBody } as any,
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

  // GET /api/mail/inbox
  app.get(
    '/mail/inbox',
    { preHandler: [verifyAuth, verifyAgentOwnership] },
    async (req, reply) => {
      const { agent_id } = req.query as { agent_id: string };
      if (!agent_id) return reply.code(400).send({ error: 'agent_id required' });
      reply.send(letterService.listInbox(agent_id));
    }
  );

  // GET /api/mail/:id
  app.get('/mail/:id', { preHandler: [verifyAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const letter = letterService.read(id);
    if (!letter) return reply.code(404).send({ error: 'LETTER_NOT_FOUND' });

    const letterAny = letter as any;
    const agent = agentRepo.getById(letterAny.to_agent_id);
    if (!agent || agent.owner_user_id !== getAuthUser(req).sub) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }
    reply.send(letter);
  });

  // POST /api/mail/:id/reprocess
  app.post('/mail/:id/reprocess', { preHandler: [verifyAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const letter = letterRepo.getById(id);
    if (!letter) return reply.code(404).send({ error: 'LETTER_NOT_FOUND' });
    const agent = agentRepo.getById(letter.to_agent_id);
    if (!agent || agent.owner_user_id !== getAuthUser(req).sub) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }
    letterService.reprocess(id);
    reply.send({ ok: true });
  });
}
