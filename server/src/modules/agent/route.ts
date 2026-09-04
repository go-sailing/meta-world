import type { FastifyInstance } from 'fastify';
import { agentService } from './service.js';
import { verifyAuth, verifyAgentOwnership, verifyAgentOwnershipAnyStatus, getAuthUser } from '../../middleware/index.js';

const createBody = {
  type: 'object',
  required: ['name', 'persona_tags'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 20 },
    persona_tags: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    is_public: { type: 'boolean' },
  },
} as const;

const updateBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 20 },
    persona_tags: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    is_public: { type: 'boolean' },
  },
  minProperties: 1,
} as const;

export async function agentRoutes(app: FastifyInstance) {
  // POST /api/agents
  app.post(
    '/agents',
    {
      preHandler: [verifyAuth],
      schema: { body: createBody } as any,
    },
    async (req, reply) => {
      try {
        const agent = agentService.create(req.body as any, getAuthUser(req).sub);
        reply.code(201).send(agent);
      } catch (err: any) {
        if (err.code === 'AGENT_LIMIT_EXCEEDED') {
          return reply.code(400).send({ error: 'AGENT_LIMIT_EXCEEDED', message: '最多创建 10 个智能体' });
        }
        if (err.code === 'AGENT_NAME_DUPLICATE') {
          return reply.code(409).send({ error: 'AGENT_NAME_DUPLICATE', message: '该名称已被使用' });
        }
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // GET /api/agents — 我的智能体列表
  app.get('/agents', { preHandler: [verifyAuth] }, async (req, reply) => {
    reply.send({ agents: agentService.listMine(getAuthUser(req).sub) });
  });

  // GET /api/agents/discover — 发现公开智能体
  app.get('/agents/discover', { preHandler: [verifyAuth] }, async (req, reply) => {
    const { keyword, page, size } = req.query as { keyword?: string; page?: string; size?: string };
    const result = agentService.discover(
      keyword,
      Number(page) || 1,
      Math.min(Number(size) || 20, 50)
    );
    reply.send(result);
  });

  // GET /api/agents/:id
  app.get(
    '/agents/:id',
    { preHandler: [verifyAuth, verifyAgentOwnership] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const agent = agentService.getById(id);
      if (!agent) return reply.code(404).send({ error: 'AGENT_NOT_FOUND' });
      reply.send(agent);
    }
  );

  // PUT /api/agents/:id
  app.put(
    '/agents/:id',
    {
      preHandler: [verifyAuth, verifyAgentOwnership],
      schema: { body: updateBody } as any,
    },
    async (req, reply) => {
      try {
        const id = (req.params as { id: string }).id;
        const agent = agentService.update(id, req.body as any, getAuthUser(req).sub);
        reply.send(agent);
      } catch (err: any) {
        if (err.code === 'AGENT_NAME_DUPLICATE') {
          return reply.code(409).send({ error: 'AGENT_NAME_DUPLICATE' });
        }
        if (err.code === 'FORBIDDEN') {
          return reply.code(403).send({ error: 'FORBIDDEN' });
        }
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // PUT /api/agents/:id/disable
  app.put(
    '/agents/:id/disable',
    { preHandler: [verifyAuth, verifyAgentOwnershipAnyStatus] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      agentService.disable(id);
      reply.send({ ok: true });
    }
  );

  // PUT /api/agents/:id/enable
  app.put(
    '/agents/:id/enable',
    { preHandler: [verifyAuth, verifyAgentOwnershipAnyStatus] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      agentService.enable(id);
      reply.send({ ok: true });
    }
  );

  // DELETE /api/agents/:id
  app.delete(
    '/agents/:id',
    { preHandler: [verifyAuth, verifyAgentOwnershipAnyStatus] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      agentService.hardDelete(id);
      reply.code(204).send();
    }
  );
}
