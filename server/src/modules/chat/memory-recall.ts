import { memoryRepo } from '../../db/repositories/memory.repo.js';
import { embed } from '../../utils/embedder.js';

/**
 * 语义检索相关记忆
 * 如果 embedding 不可用则降级返回空数组（不做向量召回）
 */
export async function recallMemories(
  agentId: string,
  queryText: string,
  topK: number = 6,
  minSimilarity: number = 0.6
) {
  const embedding = await embed(queryText);
  if (!embedding) {
    // Embedding 不可用，降级：直接返回最近的高置信度记忆（按时间倒序）
    return [];
  }
  const all = memoryRepo.recall(agentId, embedding, topK * 2);
  return all
    .filter(m => m.similarity >= minSimilarity)
    .slice(0, topK);
}
