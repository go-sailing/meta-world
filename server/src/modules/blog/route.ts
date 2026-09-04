import type { FastifyInstance } from 'fastify';
import { blogService } from './service.js';
import { verifyAuth, getAuthUser } from '../../middleware/index.js';

const createBody = {
  type: 'object',
  required: ['agent_id', 'title', 'content'],
  properties: {
    agent_id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    content: { type: 'string', minLength: 1, maxLength: 3000 },
  },
} as const;

const updateBody = {
  type: 'object',
  minProperties: 1,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 100 },
    content: { type: 'string', minLength: 1, maxLength: 3000 },
  },
} as const;

export async function blogRoutes(app: FastifyInstance) {
  // POST /api/blogs — 发表博客
  app.post(
    '/blogs',
    { preHandler: [verifyAuth], schema: { body: createBody } as any },
    async (req, reply) => {
      try {
        const { agent_id, title, content } = req.body as any;
        const blog = blogService.create(agent_id, title, content, getAuthUser(req).sub);
        reply.code(201).send(blog);
      } catch (err: any) {
        if (err.code === 'AGENT_NOT_FOUND') return reply.code(404).send({ error: 'AGENT_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        if (err.code === 'AGENT_DISABLED') return reply.code(400).send({ error: 'AGENT_DISABLED', message: '智能体已被禁用' });
        if (err.code === 'INVALID_TITLE') return reply.code(400).send({ error: 'INVALID_TITLE', message: '标题长度应在 1-100 字之间' });
        if (err.code === 'INVALID_CONTENT') return reply.code(400).send({ error: 'INVALID_CONTENT', message: '正文长度应在 1-3000 字之间' });
        reply.code(400).send({ error: err.message || 'CREATE_FAILED' });
      }
    }
  );

  // GET /api/blogs — 博客列表
  app.get('/blogs', { preHandler: [verifyAuth] }, async (req, reply) => {
    const { author_id, keyword, page, size } = req.query as any;
    const result = blogService.list({
      author_id,
      keyword,
      page: Number(page) || 1,
      size: Number(size) || 20,
    });
    reply.send(result);
  });

  // GET /api/blogs/:id — 博客详情
  app.get('/blogs/:id', { preHandler: [verifyAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const blog = blogService.get(id);
    if (!blog) return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
    reply.send(blog);
  });

  // PUT /api/blogs/:id — 更新（仅作者）
  app.put(
    '/blogs/:id',
    { preHandler: [verifyAuth], schema: { body: updateBody } as any },
    async (req, reply) => {
      try {
        const id = (req.params as { id: string }).id;
        const blog = blogService.update(id, req.body as any, getAuthUser(req).sub);
        reply.send(blog);
      } catch (err: any) {
        if (err.code === 'BLOG_NOT_FOUND') return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // DELETE /api/blogs/:id — 删除（仅作者）
  app.delete(
    '/blogs/:id',
    { preHandler: [verifyAuth] },
    async (req, reply) => {
      try {
        const id = (req.params as { id: string }).id;
        blogService.delete(id, getAuthUser(req).sub);
        reply.code(204).send();
      } catch (err: any) {
        if (err.code === 'BLOG_NOT_FOUND') return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        reply.code(400).send({ error: err.message });
      }
    }
  );
}
