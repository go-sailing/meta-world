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
