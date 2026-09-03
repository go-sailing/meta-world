import { memoryRepo } from '../../db/repositories/memory.repo.js';
import { embed } from '../../utils/embedder.js';

/**
 * 语义检索相关记忆 —— 先把 query 向量化，再查 Top-K
 */
export async function recallMemories(
  agentId: string,
  queryText: string,
  topK: number = 6,
  minSimilarity: number = 0.6
) {
  const embedding = await embed(queryText);
  const all = memoryRepo.recall(agentId, embedding, topK * 2); // 多取一点再过滤
  return all
    .filter(m => m.similarity >= minSimilarity)
    .slice(0, topK);
}
