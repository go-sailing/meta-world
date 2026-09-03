import type { ExtractResult } from './extractor.js';
import type { MemoryLayer } from '@meta-world/shared';

interface ClassifyContext {
  source: 'dialogue' | 'letter_receive' | 'letter_send';
  agentId: string;
  /** other 层目标主体 ID（对话中一般是用户，信件中是对端智能体） */
  targetId?: string;
}

export function decideLayer(
  item: ExtractResult,
  _ctx: ClassifyContext
): MemoryLayer {
  const t = item.tentative_layer;
  if (t === 'self' || t === 'world' || t === 'other') return t;

  // LLM 没判断对，兜底：如果内容含"我"或"我的" → self，否则 world
  if (/我(是|的|喜欢|觉得|认为)/.test(item.content)) return 'self';
  return 'world';
}

/** 根据记忆来源计算置信度 */
export function computeConfidence(
  sourceType: 'dialogue' | 'letter_receive' | 'letter_send'
): number {
  switch (sourceType) {
    case 'dialogue':        return 0.9;  // 用户直接陈述，最可信
    case 'letter_receive':  return 0.7;  // 他人来信，中等可信
    case 'letter_send':     return 0.6;  // 自己发出去的，存个记忆也行
    default:                return 0.5;
  }
}
