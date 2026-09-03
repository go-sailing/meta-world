import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';
import type { Letter, LetterStatus, LetterListItem, SendLetterRequest } from '@meta-world/shared';

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
};
