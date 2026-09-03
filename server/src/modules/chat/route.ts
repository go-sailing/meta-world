import { FastifyInstance } from 'fastify';
import { chatRequestSchema } from '../agent/schema.js';
import { chatService } from './service.js';

export async function chatRoutes(app: FastifyInstance) {
  // POST /api/chat — 非流式
  app.post('/chat', { schema: chatRequestSchema as any }, async (req, reply) => {
    const { agent_id, message } = req.body as any;
    try {
      const result = await chatService.sendMessage(agent_id, message);
      reply.send(result);
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // POST /api/chat/stream — SSE 流式
  app.post('/chat/stream', { schema: chatRequestSchema as any }, async (req, reply) => {
    const { agent_id, message } = req.body as any;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    try {
      const refs: string[] = [];
      for await (const token of chatService.sendMessageStream(agent_id, message)) {
        reply.raw.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
      }
      reply.raw.write(`event: done\ndata: ${JSON.stringify({ memory_refs: refs })}\n\n`);
    } catch (err: any) {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });
}
