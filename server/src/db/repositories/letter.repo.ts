import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';
import type { Letter, LetterStatus, LetterListItem, SendLetterRequest } from '@meta-world/shared';

export interface SentLetterListItem {
  letter_id: string;
  to_agent_id: string;
  to_name: string;
  subject: string | null;
  status: LetterStatus;
  sent_at: string;
  has_reply: boolean;
  reply_preview: string | null;
}

export const letterRepo = {
  insert(req: SendLetterRequest): string {
    const db = getDb();
    const letterId = randomUUID();
    db.prepare(
      `INSERT INTO letter (letter_id, from_agent_id, to_agent_id, subject, body, status, reply_to)
       VALUES (?, ?, ?, ?, ?, 'sent', ?)`
    ).run(letterId, req.from_agent_id, req.to_agent_id, req.subject || null, req.body, req.reply_to || null);
    return letterId;
  },

  deliver(letterId: string): void {
    const db = getDb();
    db.prepare(
      `UPDATE letter SET status = 'delivered', delivered_at = datetime('now') WHERE letter_id = ?`
    ).run(letterId);
  },

  getById(id: string): Letter | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM letter WHERE letter_id = ?`).get(id) as any;
    if (!row) return null;
    return row as Letter;
  },

  updateStatus(id: string, status: LetterStatus): void {
    const db = getDb();
    db.prepare(`UPDATE letter SET status = ? WHERE letter_id = ?`).run(status, id);
  },

  markProcessed(id: string): void {
    const db = getDb();
    db.prepare(`UPDATE letter SET processed_at = datetime('now') WHERE letter_id = ?`).run(id);
  },

  markRead(id: string): void {
    const db = getDb();
    db.prepare(
      `UPDATE letter SET status = 'read', read_at = datetime('now') WHERE letter_id = ?`
    ).run(id);
  },

  countUnreadForAgent(agentId: string): number {
    const db = getDb();
    return (
      db.prepare(
        `SELECT COUNT(*) AS c FROM letter WHERE to_agent_id = ? AND status = 'delivered'`
      ).get(agentId) as any
    ).c as number;
  },

  listInbox(agentId: string): LetterListItem[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT l.*, a.name AS from_name
         FROM letter l
         JOIN agent a ON a.agent_id = l.from_agent_id
         WHERE l.to_agent_id = ?
         ORDER BY l.sent_at DESC`
      )
      .all(agentId) as any[];
    return rows.map(r => ({
      letter_id: r.letter_id,
      from_agent_id: r.from_agent_id,
      from_name: r.from_name,
      subject: r.subject || undefined,
      status: r.status as LetterStatus,
      sent_at: r.sent_at,
      is_unread: r.status === 'delivered',
    }));
  },

  /** 查询某智能体发出的所有信件 */
  listSent(agentId: string): SentLetterListItem[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
            l.letter_id,
            l.to_agent_id,
            a2.name AS to_name,
            l.subject,
            l.status,
            l.sent_at,
            r.body AS reply_body
         FROM letter l
         JOIN agent a2 ON a2.agent_id = l.to_agent_id
         LEFT JOIN letter r ON r.reply_to = l.letter_id
         WHERE l.from_agent_id = ?
         ORDER BY l.sent_at DESC`
      )
      .all(agentId) as any[];

    // 去重：一封原信可能有多封回复，用 Map 取第一条（最新的已由 ORDER BY 保证在前面）
    const result: SentLetterListItem[] = [];
    const seen = new Set<string>();

    rows.forEach(r => {
      if (seen.has(r.letter_id)) return;
      seen.add(r.letter_id);

      result.push({
        letter_id: r.letter_id,
        to_agent_id: r.to_agent_id,
        to_name: r.to_name,
        subject: r.subject,
        status: r.status as LetterStatus,
        sent_at: r.sent_at,
        has_reply: !!r.reply_body,
        reply_preview: r.reply_body ? r.reply_body.slice(0, 80) : null,
      });
    });

    return result;
  },

  /** 判断一封原信是否已有回复 */
  hasReply(letterId: string): boolean {
    const db = getDb();
    const row = db
      .prepare(`SELECT 1 FROM letter WHERE reply_to = ? LIMIT 1`)
      .get(letterId) as any;
    return !!row;
  },
};
