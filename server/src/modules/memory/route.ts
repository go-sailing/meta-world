// server/src/modules/memory/route.ts
import type { FastifyInstance } from 'fastify';
import { memoryRepo } from '../../db/repositories/memory.repo.js';
import { verifyAuth, verifyAgentOwnership } from '../../middleware/index.js';

export async function memoryRoutes(app: FastifyInstance) {
  // GET /api/memory/list?agent_id=xxx
  app.get(
    '/memory/list',
    { preHandler: [verifyAuth, verifyAgentOwnership] },
    async (req, reply) => {
      const q = req.query as {
        agent_id: string;
        layer?: string;
        source?: string;
        sort?: string;
        page?: string;
        size?: string;
      };
      if (!q.agent_id) return reply.code(400).send({ error: 'agent_id required' });

      const validLayers = ['all', 'self', 'world', 'other'];
      const validSources = ['all', 'dialogue', 'letter_receive', 'letter_send'];
      const validSorts = ['confidence_desc', 'time_desc'];

      const layer = (validLayers.includes(q.layer || 'all') ? q.layer : 'all') as any;
      const source = (validSources.includes(q.source || 'all') ? q.source : 'all') as any;
      const sort = (validSorts.includes(q.sort || '') ? q.sort : 'confidence_desc') as any;

      const result = memoryRepo.listForAgent({
        agent_id: q.agent_id,
        layer,
        source,
        sort,
        page: Number(q.page) || 1,
        size: Number(q.size) || 20,
      });

      reply.send(result);
    }
  );
}
