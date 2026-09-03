import { FastifyInstance } from 'fastify';
import { chatService } from './service.js';

const chatBody = {
  type: 'object',
  required: ['agent_id', 'message'],
  properties: {
    agent_id: { type: 'string' },
    message: { type: 'string', maxLength: 2000 },
  },
} as const;

export async function chatRoutes(app: FastifyInstance) {
  app.post('/chat', { schema: { body: chatBody } as any }, async (req, reply) => {
    const { agent_id, message } = req.body as any;
    try {
      const result = await chatService.sendMessage(agent_id, message);
      reply.send(result);
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  app.post('/chat/stream', { schema: { body: chatBody } as any }, async (req, reply) => {
    const { agent_id, message } = req.body as any;
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    try {
      for await (const token of chatService.sendMessageStream(agent_id, message)) {
        reply.raw.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
      }
      reply.raw.write(`event: done\ndata: ${JSON.stringify({ memory_refs: [] })}\n\n`);
    } catch (err: any) {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });
}
