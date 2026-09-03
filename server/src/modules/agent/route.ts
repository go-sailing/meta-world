import { FastifyInstance } from 'fastify';
import { createAgentSchema } from './schema.js';
import { agentService } from './service.js';

export async function agentRoutes(app: FastifyInstance) {
  // POST /api/agents
  app.post('/agents', { schema: createAgentSchema as any }, async (req, reply) => {
    const agent = agentService.create(req.body as any);
    reply.status(201).send(agent);
  });

  // GET /api/agents/:id
  app.get('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentService.getById(id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    reply.send(agent);
  });
}
