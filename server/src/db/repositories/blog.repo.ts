import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';

export interface BlogRow {
  blog_id: string;
  author_agent_id: string;
  title: string;
  content: string;
  created_at: string;
}

export const blogRepo = {
  insert(row: Omit<BlogRow, 'created_at'>): string {
    const db = getDb();
    const blogId = randomUUID();
    db.prepare(
      `INSERT INTO blog_post (blog_id, author_agent_id, title, content)
       VALUES (?, ?, ?, ?)`
    ).run(blogId, row.author_agent_id, row.title, row.content);
    return blogId;
  },

  getById(blogId: string): BlogRow | null {
    const db = getDb();
    return db.prepare(`SELECT * FROM blog_post WHERE blog_id = ?`)
      .get(blogId) as BlogRow | null;
  },

  deleteById(blogId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM blog_post WHERE blog_id = ?`).run(blogId);
  },

  deleteByAuthor(agentId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM blog_post WHERE author_agent_id = ?`).run(agentId);
  },

  update(blogId: string, patch: Partial<Pick<BlogRow, 'title' | 'content'>>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];
    if (patch.title !== undefined) { fields.push('title = ?'); values.push(patch.title); }
    if (patch.content !== undefined) { fields.push('content = ?'); values.push(patch.content); }
    if (fields.length === 0) return;
    values.push(blogId);
    db.prepare(`UPDATE blog_post SET ${fields.join(', ')} WHERE blog_id = ?`).run(...values);
  },

  list(params: {
    author_id?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }): { rows: any[]; total: number } {
    const db = getDb();
    const { author_id, keyword, page = 1, size = 20 } = params;

    const where: string[] = [];
    const args: any[] = [];

    if (author_id) {
      where.push('bp.author_agent_id = ?');
      args.push(author_id);
    }
    if (keyword) {
      where.push('(bp.title LIKE ? OR bp.content LIKE ?)');
      const kw = `%${keyword}%`;
      args.push(kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * Math.min(size, 50);

    const total = (db.prepare(`
      SELECT COUNT(*) AS c FROM blog_post bp ${whereSql}`)
      .get(...args) as any).c as number;

    const rows = db.prepare(`
      SELECT bp.*, a.name AS author_name, a.persona_tags AS author_tags
      FROM blog_post bp
      JOIN agent a ON a.agent_id = bp.author_agent_id
      ${whereSql}
      ORDER BY bp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...args, Math.min(size, 50), offset) as any[];

    return { rows, total };
  },

  getDetail(blogId: string): (BlogRow & { author_name: string; author_tags: string }) | null {
    const db = getDb();
    return db.prepare(`
      SELECT bp.*, a.name AS author_name, a.persona_tags AS author_tags
      FROM blog_post bp
      JOIN agent a ON a.agent_id = bp.author_agent_id
      WHERE bp.blog_id = ?
    `).get(blogId) as any;
  },
};
