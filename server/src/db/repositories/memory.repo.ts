import { randomUUID } from 'node:crypto';
import { getDb, isVecEnabled } from '../index.js';
import type { MemoryItem, MemoryLayer, MemorySource } from '@meta-world/shared';

interface InsertParams {
  memory_id: string;
  agent_id: string;
  layer: MemoryLayer;
  target_agent_id?: string;
  content: string;
  confidence: number;
  source_type: MemorySource;
  source_id: string;
  embedding: number[];
}

export interface MemoryListParams {
  agent_id: string;
  layer?: 'all' | 'self' | 'world' | 'other';
  source?: 'all' | 'dialogue' | 'letter_receive' | 'letter_send';
  sort?: 'confidence_desc' | 'time_desc';
  page?: number;
  size?: number;
}

export interface MemoryListItem extends MemoryItem {
  target_agent_name: string | null;
}

export const memoryRepo = {
  /** 插入记忆条目 + 向量 */
  insertWithVector(p: InsertParams): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO memory_item
        (memory_id, agent_id, layer, target_agent_id, content, confidence, source_type, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      p.memory_id, p.agent_id, p.layer,
      p.target_agent_id || null, p.content, p.confidence,
      p.source_type, p.source_id
    );

    // 向量存储
    if (isVecEnabled()) {
      db.prepare(
        `INSERT INTO memory_vec(rowid, embedding) VALUES (?, ?)`
      ).run(p.memory_id, JSON.stringify(p.embedding));
    } else {
      // fallback：用 blob 存 JSON 序列化后的向量
      db.prepare(
        `INSERT INTO memory_vec(rowid, embedding) VALUES (?, ?)`
      ).run(p.memory_id, Buffer.from(JSON.stringify(p.embedding)));
    }
  },

  /**
   * 语义检索 Top-K 记忆
   * @param agentId 所属智能体
   * @param queryEmbedding 查询向量
   * @param topK 返回条数
   * @param minConfidence 最低置信度
   */
  recall(
    agentId: string,
    queryEmbedding: number[],
    topK: number = 6,
    minConfidence: number = 0.5
  ): (MemoryItem & { similarity: number })[] {
    const db = getDb();

    if (isVecEnabled()) {
      // sqlite-vec 原生 cosine 距离查询
      const rows = db
        .prepare(
          `SELECT m.*, (1.0 - distance) AS similarity
           FROM memory_vec v
           JOIN memory_item m ON m.memory_id = v.rowid
           WHERE m.agent_id = ? AND m.confidence >= ?
           ORDER BY v.embedding <=> ?
           LIMIT ?`
        )
        .all(agentId, minConfidence, JSON.stringify(queryEmbedding), topK) as any[];
      return rows.map(r => ({ ...(r as MemoryItem), similarity: r.similarity }));
    }

    // Fallback：在 Node 层做余弦距离计算
    const rows = db
      .prepare(
        `SELECT m.*, v.embedding
         FROM memory_item m
         JOIN memory_vec v ON v.rowid = m.memory_id
         WHERE m.agent_id = ? AND m.confidence >= ?`
      )
      .all(agentId, minConfidence) as any[];

    const withSim = rows.map(r => {
      const stored = typeof r.embedding === 'string'
        ? JSON.parse(r.embedding)
        : JSON.parse(r.embedding.toString());
      return {
        ...(r as MemoryItem),
        similarity: cosineSimilarity(queryEmbedding, stored),
      };
    });
    return withSim.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  },

  /** 查询某个智能体的记忆列表（支持筛选、排序、分页） */
  listForAgent(params: MemoryListParams): { items: MemoryListItem[]; total: number } {
    const db = getDb();
    const {
      agent_id,
      layer = 'all',
      source = 'all',
      sort = 'confidence_desc',
      page = 1,
      size = 20,
    } = params;

    const where: string[] = ['m.agent_id = ?'];
    const args: any[] = [agent_id];

    if (layer !== 'all') {
      where.push('m.layer = ?');
      args.push(layer);
    }
    if (source !== 'all') {
      where.push('m.source_type = ?');
      args.push(source);
    }

    const orderBy =
      sort === 'time_desc' ? 'm.created_at DESC' : 'm.confidence DESC, m.created_at DESC';

    const whereSql = where.join(' AND ');

    // total count
    const total = (
      db.prepare(
        `SELECT COUNT(*) AS c FROM memory_item m WHERE ${whereSql}`
      ).get(...args) as any
    ).c as number;

    // rows with target agent name
    const offset = (page - 1) * size;
    const rows = db
      .prepare(
        `SELECT m.*, a.name AS target_agent_name
         FROM memory_item m
         LEFT JOIN agent a ON a.agent_id = m.target_agent_id
         WHERE ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...args, Math.min(size, 200), offset) as any[];

    return {
      total,
      items: rows.map(r => ({
        memory_id: r.memory_id,
        agent_id: r.agent_id,
        layer: r.layer,
        target_agent_id: r.target_agent_id || undefined,
        target_agent_name: r.target_agent_name,
        content: r.content,
        confidence: r.confidence,
        source_type: r.source_type,
        source_id: r.source_id,
        created_at: r.created_at,
      })),
    };
  },
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
