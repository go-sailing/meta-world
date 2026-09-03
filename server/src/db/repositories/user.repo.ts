import { getDb } from '../index.js';

export interface UserRow {
  user_id: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
}

export const userRepo = {
  findByEmail(email: string): UserRow | null {
    const db = getDb();
    return db.prepare('SELECT * FROM user WHERE email = ?').get(email) as UserRow | null;
  },

  findById(userId: string): UserRow | null {
    const db = getDb();
    return db.prepare('SELECT * FROM user WHERE user_id = ?').get(userId) as UserRow | null;
  },

  insert(row: { user_id: string; email: string; password_hash: string }): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO user (user_id, email, password_hash) VALUES (?, ?, ?)`
    ).run(row.user_id, row.email, row.password_hash);
  },

  updateLastLoginAt(userId: string): void {
    const db = getDb();
    db.prepare(
      `UPDATE user SET last_login_at = datetime('now') WHERE user_id = ?`
    ).run(userId);
  },
};
