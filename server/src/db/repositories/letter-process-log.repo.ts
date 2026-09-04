import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';

export interface LetterProcessLogRow {
  log_id: string;
  letter_id: string;
  seq: number;
  event_type: string;
  detail: string | null;
  created_at: string;
}

export const letterProcessLogRepo = {
  /** 获取某封信的下一个 seq 序号 */
  nextSeq(letterId: string): number {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT MAX(seq) AS m FROM letter_process_log WHERE letter_id = ?`
      )
      .get(letterId) as { m: number | null };
    return (row.m ?? 0) + 1;
  },

  /** 写入一条处理日志 */
  insert(letterId: string, eventType: string, detail?: Record<string, unknown>): void {
    const db = getDb();
    const logId = randomUUID();
    const seq = this.nextSeq(letterId);
    db.prepare(
      `INSERT INTO letter_process_log (log_id, letter_id, seq, event_type, detail)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      logId,
      letterId,
      seq,
      eventType,
      detail ? JSON.stringify(detail) : null
    );
  },

  /** 查询某封信的所有处理日志，按 seq 排序 */
  listByLetter(letterId: string): LetterProcessLogRow[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT * FROM letter_process_log WHERE letter_id = ? ORDER BY seq ASC`
      )
      .all(letterId) as LetterProcessLogRow[];
  },

  /** 清空某封信的日志（reprocess 时调用） */
  clearByLetter(letterId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM letter_process_log WHERE letter_id = ?`).run(letterId);
  },
};
