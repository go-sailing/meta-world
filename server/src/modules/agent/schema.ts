import { z } from 'zod';

export const createAgentSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(20),
    persona_tags: z.array(z.string()).min(1).max(5),
  }),
});

export const chatRequestSchema = z.object({
  body: z.object({
    agent_id: z.string().uuid(),
    message: z.string().max(2000),
  }),
});

export const sendLetterSchema = z.object({
  body: z.object({
    from_agent_id: z.string().uuid(),
    to_agent_id: z.string().uuid(),
    subject: z.string().max(50).optional(),
    body: z.string().max(2000),
  }),
});
