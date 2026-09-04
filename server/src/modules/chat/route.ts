import type { FastifyInstance } from 'fastify';
import { chatService } from './service.js';
import { verifyAuth, verifyAgentOwnership } from '../../middleware/index.js';
import { getAuthUser } from '../../middleware/auth.js';

const chatBody = {
  type: 'object',
  required: ['agent_id', 'message'],
  properties: {
    agent_id: { type: 'string' },
    message: { type: 'string', maxLength: 2000 },
  },
} as const;

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    '/chat',
    {
      preHandler: [verifyAuth, verifyAgentOwnership],
      schema: { body: chatBody } as any,
    },
    async (req, reply) => {
      const { agent_id, message } = req.body as any;
      const user = getAuthUser(req);
      try {
        const result = await chatService.sendMessage(agent_id, message, user.sub);
        reply.send(result);
      } catch (err: any) {
        reply.code(400).send({ error: err.message });
      }
    }
  );

  app.post(
    '/chat/stream',
    {
      preHandler: [verifyAuth, verifyAgentOwnership],
      schema: { body: chatBody } as any,
    },
    async (req, reply) => {
      const { agent_id, message } = req.body as any;
      const user = getAuthUser(req);
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      try {
        for await (const chunk of chatService.sendMessageStream(agent_id, message, user.sub)) {
          if (chunk.type === 'tools') {
            reply.raw.write(`event: tools\ndata: ${JSON.stringify(chunk.data)}\n\n`);
          } else if (chunk.type === 'tokens') {
            reply.raw.write(`event: token\ndata: ${JSON.stringify({ content: chunk.data })}\n\n`);
          } else if (chunk.type === 'done') {
            reply.raw.write(`event: done\ndata: ${JSON.stringify({ memory_refs: chunk.memory_refs ?? [] })}\n\n`);
          }
        }
      } catch (err: any) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      } finally {
        reply.raw.end();
      }
    }
  );
}
