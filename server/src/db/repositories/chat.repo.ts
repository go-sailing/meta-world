import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';
import type { ChatMessage } from '@meta-world/shared';

export const chatRepo = {
  /** 获取最近 N 轮对话（N*2 条） */
  getRecent(agentId: string, rounds: number = 20): ChatMessage[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM chat_message WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(agentId, rounds * 2) as any[];
    // 反转为正序
    return rows.reverse().map(row => ({
      msg_id: row.msg_id,
      agent_id: row.agent_id,
      role: row.role,
      content: row.content,
      created_at: row.created_at,
    }));
  },

  insert(agentId: string, role: 'user' | 'assistant', content: string): string {
    const db = getDb();
    const msgId = randomUUID();
    db.prepare(
      `INSERT INTO chat_message (msg_id, agent_id, role, content) VALUES (?, ?, ?, ?)`
    ).run(msgId, agentId, role, content);
    return msgId;
  },
};
