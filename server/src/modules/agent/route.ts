import { FastifyInstance } from 'fastify';
import { agentService } from './service.js';

const createAgentBody = {
  type: 'object',
  required: ['name', 'persona_tags'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 20 },
    persona_tags: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: { type: 'string' },
    },
  },
} as const;

export async function agentRoutes(app: FastifyInstance) {
  app.post('/agents', { schema: { body: createAgentBody } as any }, async (req, reply) => {
    const agent = agentService.create(req.body as any);
    reply.status(201).send(agent);
  });

  app.get('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentService.getById(id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    reply.send(agent);
  });
}
