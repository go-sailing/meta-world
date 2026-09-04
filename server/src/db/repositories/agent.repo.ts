import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';
import type { CreateAgentRequest } from '@meta-world/shared';

export interface AgentRow {
  agent_id: string;
  owner_user_id: string | null;
  name: string;
  persona_tags: string[];
  is_public: boolean;
  created_at: string;
  status: 'active' | 'disabled';
}

interface AgentRowRaw {
  agent_id: string;
  owner_user_id: string | null;
  name: string;
  persona_tags: string;
  is_public: number;
  created_at: string;
  status: 'active' | 'disabled';
}

function rowToAgent(row: AgentRowRaw): AgentRow {
  return {
    agent_id: row.agent_id,
    owner_user_id: row.owner_user_id,
    name: row.name,
    persona_tags: JSON.parse(row.persona_tags || '[]'),
    is_public: !!row.is_public,
    created_at: row.created_at,
    status: row.status,
  };
}

export const agentRepo = {
  // —— 归属查询 ——
  listByUser(userId: string): AgentRow[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM agent WHERE owner_user_id = ? ORDER BY created_at DESC`
      )
      .all(userId) as AgentRowRaw[];
    return rows.map(rowToAgent);
  },

  countByUser(userId: string): number {
    const db = getDb();
    return (
      db.prepare(`SELECT COUNT(*) AS c FROM agent WHERE owner_user_id = ?`).get(userId) as any
    ).c as number;
  },

  hasNameConflict(userId: string, name: string, excludeAgentId?: string): boolean {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT agent_id FROM agent WHERE owner_user_id = ? AND name = ?`
      )
      .get(userId, name) as { agent_id: string } | undefined;
    if (!row) return false;
    return row.agent_id !== excludeAgentId;
  },

  // —— discover ——
  listPublic(keyword?: string, page = 1, size = 20): { rows: (AgentRow & { owner_email: string | null })[]; total: number } {
    const db = getDb();
    const offset = (page - 1) * size;
    const hasKeyword = !!keyword;
    const whereSql = hasKeyword
      ? `WHERE a.is_public = 1 AND a.status = 'active' AND a.name LIKE ?`
      : `WHERE a.is_public = 1 AND a.status = 'active'`;
    const kw = hasKeyword ? `%${keyword}%` : undefined;

    const totalArgs = hasKeyword ? [kw] : [];
    const rowsArgs = hasKeyword ? [kw, size, offset] : [size, offset];

    const total = (db.prepare(`SELECT COUNT(*) AS c FROM agent a ${whereSql}`).get(...totalArgs) as any).c;
    const rows = db
      .prepare(
        `SELECT a.*, u.email AS owner_email
         FROM agent a LEFT JOIN user u ON u.user_id = a.owner_user_id
         ${whereSql}
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...rowsArgs) as (AgentRowRaw & { owner_email: string | null })[];

    return {
      total,
      rows: rows.map(r => ({ ...rowToAgent(r), owner_email: r.owner_email })),
    };
  },

  // —— CRUD ——
  update(agentId: string, patch: Partial<Pick<AgentRow, 'name' | 'persona_tags' | 'is_public'>>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (patch.name !== undefined) {
      fields.push('name = ?');
      values.push(patch.name);
    }
    if (patch.persona_tags !== undefined) {
      fields.push('persona_tags = ?');
      values.push(JSON.stringify(patch.persona_tags));
    }
    if (patch.is_public !== undefined) {
      fields.push('is_public = ?');
      values.push(patch.is_public ? 1 : 0);
    }
    if (fields.length === 0) return;
    values.push(agentId);

    db.prepare(`UPDATE agent SET ${fields.join(', ')} WHERE agent_id = ?`).run(...values);
  },

  disable(agentId: string): void {
    const db = getDb();
    db.prepare(`UPDATE agent SET status = 'disabled' WHERE agent_id = ?`).run(agentId);
  },

  enable(agentId: string): void {
    const db = getDb();
    db.prepare(`UPDATE agent SET status = 'active' WHERE agent_id = ?`).run(agentId);
  },

  /**
   * 硬删除一个智能体及其所有关联数据（事务保证原子性）
   * 按外键依赖的拓扑顺序清理：先删最底层的日志/向量 → 再删子表 → 最后删父表 agent。
   * 注意：memory_item 的 target_agent_id 也能引用被删 agent（other 层记忆），
   *       不能只按 agent_id 删。
   */
  hardDelete(agentId: string): void {
    const db = getDb();
    const tx = db.transaction(() => {
      // 1. 最底层：letter_process_log（依赖 letter）
      //    显式清理比依赖 ON DELETE CASCADE 更保险
      const agentLetters = db
        .prepare(
          `SELECT letter_id FROM letter WHERE from_agent_id = ? OR to_agent_id = ?`
        )
        .all(agentId, agentId) as { letter_id: string }[];
      if (agentLetters.length > 0) {
        const placeholders = agentLetters.map(() => '?').join(',');
        db.prepare(
          `DELETE FROM letter_process_log WHERE letter_id IN (${placeholders})`
        ).run(...agentLetters.map(l => l.letter_id));
      }

      // 2. letter（from/to 双向引用）
      db.prepare(`DELETE FROM letter WHERE from_agent_id = ? OR to_agent_id = ?`)
        .run(agentId, agentId);

      // 3. memory_vec（依赖 memory_item.rowid）
      const memIds = db
        .prepare(
          `SELECT memory_id FROM memory_item WHERE agent_id = ? OR target_agent_id = ?`
        )
        .all(agentId, agentId) as { memory_id: string }[];
      if (memIds.length > 0) {
        const ph = memIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM memory_vec WHERE rowid IN (${ph})`)
          .run(...memIds.map(m => m.memory_id));
      }

      // 4. memory_item（注意 target_agent_id 也能引用被删 agent！）
      db.prepare(`DELETE FROM memory_item WHERE agent_id = ? OR target_agent_id = ?`)
        .run(agentId, agentId);

      // 5. address_book（双向引用）
      db.prepare(`DELETE FROM address_book WHERE owner_agent_id = ? OR target_agent_id = ?`)
        .run(agentId, agentId);

      // 6. chat_message
      db.prepare(`DELETE FROM chat_message WHERE agent_id = ?`).run(agentId);

      // 7. 父表：agent（必须最后，所有子表引用清干净了）
      db.prepare(`DELETE FROM agent WHERE agent_id = ?`).run(agentId);
    });
    tx();
  },

  // —— 原有方法（改造）——
  create(req: CreateAgentRequest & { owner_user_id: string; is_public?: boolean }): AgentRow {
    const db = getDb();
    const agentId = randomUUID();
    db.prepare(
      `INSERT INTO agent (agent_id, owner_user_id, name, persona_tags, is_public)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      agentId,
      req.owner_user_id,
      req.name,
      JSON.stringify(req.persona_tags),
      req.is_public ? 1 : 0
    );
    return agentRepo.getById(agentId)!;
  },

  getById(id: string): AgentRow | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM agent WHERE agent_id = ?`).get(id) as AgentRowRaw | undefined;
    if (!row) return null;
    return rowToAgent(row);
  },

  exists(id: string): boolean {
    return agentRepo.getById(id) !== null;
  },
};
