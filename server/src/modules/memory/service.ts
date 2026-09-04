import { randomUUID } from 'node:crypto';
import { extractMemoryPoints, type ExtractContext } from './extractor.js';
import { decideLayer, computeConfidence, resolveTargetAgentId } from './classifier.js';
import { memoryRepo } from '../../db/repositories/memory.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { embed } from '../../utils/embedder.js';
import { logger } from '../../utils/logger.js';
import type { MemoryLayer, MemorySource } from '@meta-world/shared';

interface ExtractAndStoreParams {
  agentId: string;
  sourceType: MemorySource;
  sourceId: string;            // chat msg_id 或 letter_id
  targetAgentId?: string;      // other 层目标主体的 agent_id（letter 场景为对端，对话场景一般无）
  text: string;
  /** 记忆 owner 的名字，若不填会按 agentId 查询 */
  ownerName?: string;
  /** 文本作者的名字（对话场景=人类用户传"用户"；来信=发信人；发信=owner） */
  authorName?: string;
  /** 是否人类作者（对话 true，信为 false） */
  isHumanAuthor?: boolean;
  /** 对端互动对象的名字（收到的来信=发件人，自己发的信=收件人，对话场景=用户） */
  peerName?: string;
  /** targetAgentId 对应的名称（用于做名字反校时的候选） */
  targetAgentName?: string;
}

/** 从文本抽取记忆 → 分类 → 向量化 → 入库，返回新写入的 memory_id 列表 */
export async function extractAndStore(
  params: ExtractAndStoreParams
): Promise<string[]> {
  const {
    agentId, sourceType, sourceId, targetAgentId, text,
    isHumanAuthor,
  } = params;

  // 查 owner agent 名（兜底）
  let ownerName = params.ownerName;
  if (!ownerName) {
    ownerName = agentRepo.getById(agentId)?.name || '该智能体';
  }

  // 根据来源与作者/对端参数，构造 extractor & classifier 上下文
  let authorName = params.authorName || ownerName;
  let peerName = params.peerName;
  let targetName = params.targetAgentName;

  // 缺省时的默认作者名：
  // - dialogue: 作者 = 人类用户
  // - letter_receive: 作者 = targetAgentId 对应的智能体（发信人）
  // - letter_send: 作者 = owner
  if (!params.authorName) {
    if (sourceType === 'dialogue') {
      authorName = '用户';
    } else if (sourceType === 'letter_receive' && targetAgentId) {
      authorName = agentRepo.getById(targetAgentId)?.name || '来信智能体';
    }
    // letter_send 默认 authorName = ownerName 已设置
  }

  // 缺省时的 peerName（= 对话/通信的对端）：
  // - dialogue: 对端 = 用户
  // - letter_receive: 对端 = 发信人（即作者）
  // - letter_send: 对端 = targetAgentId 对应智能体（收信人）
  if (!peerName) {
    if (sourceType === 'dialogue') peerName = '用户';
    else if (sourceType === 'letter_receive') peerName = authorName;
    else if (sourceType === 'letter_send' && targetAgentId) {
      peerName = agentRepo.getById(targetAgentId)?.name || '收信智能体';
    }
  }
  // targetName 兜底（用于 classifier targetAgentName 匹配）：
  // 有 targetAgentId 就以它为 other 层默认目标
  if (!targetName && targetAgentId) {
    targetName = agentRepo.getById(targetAgentId)?.name;
  }

  const isHuman = typeof isHumanAuthor === 'boolean'
    ? isHumanAuthor
    : (sourceType === 'dialogue');

  const extractCtx: ExtractContext = {
    ownerName,
    authorName,
    isHumanAuthor: isHuman,
    peerName,
  };

  const classifyCtxBase = {
    source: sourceType,
    agentId,
    ownerName,
    authorName,
    targetId: targetAgentId,
    targetName,
  };

  // 1. LLM 抽取（带身份上下文）
  const points = await extractMemoryPoints(text, extractCtx);
  if (points.length === 0) {
    logger.debug({ agentId, sourceType }, 'No memory points extracted');
    return [];
  }

  logger.info({ agentId, sourceType, count: points.length }, 'Memory points extracted');

  // 2. 分类 + 构造条目
  const layerCounts: Record<MemoryLayer, number> = { self: 0, world: 0, other: 0 };

  // 用于 targetAgentId 绑定的候选（信件作者和对端智能体，名字都算已知）
  const candidateAgents: Array<{ agentId: string; name: string }> = [];
  if (targetAgentId) {
    const t = agentRepo.getById(targetAgentId);
    if (t) candidateAgents.push({ agentId: t.agent_id, name: t.name });
  }
  if (sourceType === 'letter_receive' && targetAgentId) {
    // targetAgentId 就是作者（发信人），作者 agent 已经在上面了
  } else if (sourceType === 'letter_send' && targetAgentId) {
    // targetAgentId 是收信人，已经在上面了
  }

  const items = points.map(p => {
    const layer = decideLayer(p, classifyCtxBase);
    layerCounts[layer]++;

    let resolvedTargetId: string | undefined;
    if (layer === 'other') {
      resolvedTargetId = resolveTargetAgentId(p, classifyCtxBase, layer, candidateAgents) || targetAgentId;
    }

    return {
      memory_id: randomUUID(),
      agent_id: agentId,
      layer,
      target_agent_id: resolvedTargetId,
      content: p.content,
      confidence: computeConfidence(sourceType),
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
