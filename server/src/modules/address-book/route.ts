import type { FastifyInstance } from 'fastify';
import { addressBookService } from './service.js';
import { verifyAuth, verifyAgentOwnership, getAuthUser } from '../../middleware/index.js';

const addBody = {
  type: 'object',
  required: ['owner_agent_id', 'target_agent_id'],
  properties: {
    owner_agent_id: { type: 'string' },
    target_agent_id: { type: 'string' },
    nickname: { type: 'string', maxLength: 20 },
  },
} as const;

export async function addressBookRoutes(app: FastifyInstance) {
  // GET /api/address-book?agent_id=xxx
  app.get(
    '/address-book',
    { preHandler: [verifyAuth, verifyAgentOwnership] },
    async (req, reply) => {
      const { agent_id } = req.query as { agent_id: string };
      if (!agent_id) return reply.code(400).send({ error: 'agent_id required' });
      reply.send({ friends: addressBookService.list(agent_id) });
    }
  );

  // POST /api/address-book
  app.post(
    '/address-book',
    {
      preHandler: [verifyAuth, verifyAgentOwnership],
      schema: { body: addBody } as any,
    },
    async (req, reply) => {
      try {
        const entry = addressBookService.add(
          req.body as { owner_agent_id: string; target_agent_id: string; nickname?: string },
          getAuthUser(req).sub
        );
        reply.code(201).send(entry);
      } catch (err: any) {
        reply.code(400).send({ error: err.code || 'BAD_REQUEST', message: err.message || '' });
      }
    }
  );

  // DELETE /api/address-book/:entryId
  app.delete(
    '/address-book/:entryId',
    { preHandler: [verifyAuth] },
    async (req, reply) => {
      try {
        const entryId = (req.params as { entryId: string }).entryId;
        addressBookService.remove(entryId, getAuthUser(req).sub);
        reply.code(204).send();
      } catch (err: any) {
        const status = err.code === 'ENTRY_NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400;
        reply.code(status).send({ error: err.code || 'BAD_REQUEST', message: err.message || '' });
      }
    }
  );
}
