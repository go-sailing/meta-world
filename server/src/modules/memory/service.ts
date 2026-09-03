import { randomUUID } from 'node:crypto';
import { extractMemoryPoints } from './extractor.js';
import { decideLayer, computeConfidence } from './classifier.js';
import { memoryRepo } from '../../db/repositories/memory.repo.js';
import { embed } from '../../utils/embedder.js';
import { logger } from '../../utils/logger.js';
import type { MemoryLayer, MemorySource } from '@meta-world/shared';

interface ExtractAndStoreParams {
  agentId: string;
  sourceType: MemorySource;
  sourceId: string;            // chat msg_id 或 letter_id
  targetAgentId?: string;      // other 层目标
  text: string;
}

/** 从文本抽取记忆 → 分类 → 向量化 → 入库，返回新写入的 memory_id 列表 */
export async function extractAndStore(
  params: ExtractAndStoreParams
): Promise<string[]> {
  const { agentId, sourceType, sourceId, targetAgentId, text } = params;

  // 1. LLM 抽取
  const points = await extractMemoryPoints(text);
  if (points.length === 0) {
    logger.debug({ agentId, sourceType }, 'No memory points extracted');
    return [];
  }

  logger.info({ agentId, sourceType, count: points.length }, 'Memory points extracted');

  // 2. 分类 + 构造条目
  const layerCounts: Record<MemoryLayer, number> = { self: 0, world: 0, other: 0 };
  const items = points.map(p => {
    const layer = decideLayer(p, {
      source: sourceType as any,
      agentId,
      targetId: targetAgentId,
    });
    layerCounts[layer]++;

    return {
      memory_id: randomUUID(),
      agent_id: agentId,
      layer,
      target_agent_id: layer === 'other' ? (targetAgentId || agentId) : undefined,
      content: p.content,
      confidence: computeConfidence(sourceType as any),
      source_type: sourceType,
      source_id: sourceId,
    };
  });

  // 3. 向量化 + 入库
  const ids: string[] = [];
  for (const item of items) {
    try {
      const embedding = await embed(item.content);
      if (embedding) {
        memoryRepo.insertWithVector({ ...item, embedding });
      } else {
        // Embedding 不可用时：只存 memory_item 不存向量
        // 这样文字记录还在，但后续无法通过向量召回
        const db = await import('../../db/index.js').then(m => m.getDb());
        db.prepare(
          `INSERT INTO memory_item
            (memory_id, agent_id, layer, target_agent_id, content, confidence, source_type, source_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          item.memory_id, item.agent_id, item.layer,
          item.target_agent_id || null, item.content, item.confidence,
          item.source_type, item.source_id
        );
      }
      ids.push(item.memory_id);
    } catch (err) {
      logger.error({ err: (err as Error).message, item }, 'Failed to embed & store memory');
    }
  }

  logger.info({ layerCounts, stored: ids.length }, 'Memory items stored');
  return ids;
}
