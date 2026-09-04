import { getDb } from '../index.js';

export interface AddressBookRow {
  entry_id: string;
  owner_agent_id: string;
  target_agent_id: string;
  nickname: string | null;
  added_at: string;
}

export interface FriendListItem {
  entry_id: string;
  target_agent_id: string;
  name: string;
  persona_tags: string[];
  nickname: string | null;
  is_public: boolean;
  is_mutual: boolean;
  added_at: string;
}

export const addressBookRepo = {
  insert(row: Omit<AddressBookRow, 'added_at'>): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO address_book (entry_id, owner_agent_id, target_agent_id, nickname)
       VALUES (?, ?, ?, ?)`
    ).run(row.entry_id, row.owner_agent_id, row.target_agent_id, row.nickname);
  },

  findByPair(ownerAgentId: string, targetAgentId: string): AddressBookRow | null {
    const db = getDb();
    return db
      .prepare(
        `SELECT * FROM address_book WHERE owner_agent_id = ? AND target_agent_id = ?`
      )
      .get(ownerAgentId, targetAgentId) as AddressBookRow | null;
  },

  getById(entryId: string): AddressBookRow | null {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM address_book WHERE entry_id = ?`)
      .get(entryId) as AddressBookRow | null;
  },

  count(ownerAgentId: string): number {
    const db = getDb();
    return (
      db.prepare(`SELECT COUNT(*) AS c FROM address_book WHERE owner_agent_id = ?`).get(ownerAgentId) as any
    ).c as number;
  },

  deleteById(entryId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM address_book WHERE entry_id = ?`).run(entryId);
  },

  /**
   * 查询某个智能体的通讯录 + 双向好友标记
   * LEFT JOIN address_book ab2 做自连接判断双向
   */
  listFriends(ownerAgentId: string): FriendListItem[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
            ab.entry_id,
            ab.target_agent_id,
            ab.nickname,
            ab.added_at,
            a.name,
            a.persona_tags,
            a.is_public,
            a.status,
            ab2.entry_id AS mutual_entry_id
         FROM address_book ab
         JOIN agent a ON a.agent_id = ab.target_agent_id
         LEFT JOIN address_book ab2
           ON ab2.owner_agent_id = ab.target_agent_id
          AND ab2.target_agent_id = ab.owner_agent_id
         WHERE ab.owner_agent_id = ?
           AND a.status = 'active'
         ORDER BY ab.added_at DESC`
      )
      .all(ownerAgentId) as any[];

    return rows.map(r => ({
      entry_id: r.entry_id,
      target_agent_id: r.target_agent_id,
      name: r.name,
      persona_tags: JSON.parse(r.persona_tags || '[]'),
      nickname: r.nickname,
      is_public: !!r.is_public,
      is_mutual: !!r.mutual_entry_id,
      added_at: r.added_at,
    }));
  },
};
