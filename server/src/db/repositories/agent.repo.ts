import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';
import type { Agent, CreateAgentRequest } from '@meta-world/shared';

export const agentRepo = {
  create(req: CreateAgentRequest): Agent {
    const db = getDb();
    const agentId = randomUUID();
    const stmt = db.prepare(
      `INSERT INTO agent (agent_id, name, persona_tags) VALUES (?, ?, ?)`
    );
    stmt.run(agentId, req.name, JSON.stringify(req.persona_tags));
    return agentRepo.getById(agentId)!;
  },

  getById(id: string): Agent | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM agent WHERE agent_id = ?`).get(id) as any;
    if (!row) return null;
    return {
      agent_id: row.agent_id,
      name: row.name,
      persona_tags: JSON.parse(row.persona_tags || '[]'),
      created_at: row.created_at,
      status: row.status,
    };
  },

  exists(id: string): boolean {
    return agentRepo.getById(id) !== null;
  },
};
