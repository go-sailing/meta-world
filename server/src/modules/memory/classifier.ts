import type { ExtractResult } from './extractor.js';
import type { MemoryLayer, MemorySource } from '@meta-world/shared';

interface ClassifyContext {
  source: MemorySource;
  agentId: string;
  /** 记忆 owner 名 */
  ownerName: string;
  /** 文本作者名 */
  authorName: string;
  /** other 层目标主体 ID（对话中一般是用户，信件中是对端智能体） */
  targetId?: string;
  /** other 层目标主体名（对应 targetId，或提取器 target_name 命中的人） */
  targetName?: string;
  /** 提取器给每条记忆的 target_name（可选，做反校） */
  itemTargetName?: string;
}

/** 两个名字做宽松匹配（包含即命中，处理昵称/全名差异） */
function namesMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** 文本里是否明确提到了某主体名（含主语形式） */
function contentMentions(content: string, name: string): boolean {
  if (!name) return false;
  const n = name.trim();
  if (!n) return false;
  return content.includes(n);
}

export function decideLayer(
  item: ExtractResult,
  ctx: ClassifyContext
): MemoryLayer {
  const tentative = item.tentative_layer;
  const content = item.content;
  const extractorTarget = item.target_name;

  // ========== 第一优先级：强语义反校（针对信件场景最关键） ==========
  //
  // 规则 A：如果内容提到了 ownerName，且语义是在介绍 owner → self
  // 规则 B：如果内容提到了 peer/author 名，且 tentative=other 或 内容/extract target 匹配 → other
  // 规则 C：收到的来信(letter_receive)里，"我是XXX/我的XXX" → 一定是作者自己自我介绍 → other（目标=作者）
  // 规则 D：自己发信(letter_send)里的"我是XXX"才是 self

  // 信件：收到的来信中，任何作者的第一人称自述都应该绑定到作者（other），不是 owner(self)
  const authorFirstPerson = /我(是|的|叫|姓|喜欢|觉得|认为|名叫|来自)/.test(content);
  if (ctx.source === 'letter_receive' && authorFirstPerson) {
    // 作者自我介绍，肯定是关于作者的 other 记忆
    return 'other';
  }

  // 如果 extractor 给了带 target_name=other，且名字能与 author/peer/owner 对上 → 用名字精确定位 self/other
  if (tentative === 'other' && extractorTarget) {
    if (namesMatch(extractorTarget, ctx.ownerName)) {
      // 描述对象其实是 owner，应该归 self
      return 'self';
    }
    return 'other';
  }

  // 若 tentative=self 但内容中并没有 owner 名（letter 场景很容易误判），且提到了 peer / author 名 → 转 other
  if (tentative === 'self' && !contentMentions(content, ctx.ownerName)) {
    if (ctx.targetName && (contentMentions(content, ctx.targetName) || namesMatch(extractorTarget || '', ctx.targetName))) {
      return 'other';
    }
    if (authorFirstPerson && ctx.source !== 'dialogue' && ctx.authorName !== ctx.ownerName) {
      // 非对话场景的第一人称自述，若不提及 owner，更可能是作者（other）
      return 'other';
    }
  }

  // 对 tentative=other 但没 targetId 的：如果 owner 名匹配 -> self；否则仍按 other（service 层会兜底绑定作者名/对端名）
  if (tentative === 'other') {
    if (namesMatch(extractorTarget || '', ctx.ownerName) || contentMentions(content, ctx.ownerName)) {
      return 'self';
    }
    return 'other';
  }

  if (tentative === 'world') return 'world';
  if (tentative === 'self') return 'self';

  // ===== 兜底：仅对 dialogue（人类面对面和自己说话）才用原始的"我/我的"= self 判断 =====
  if (ctx.source === 'dialogue' && authorFirstPerson) return 'self';
  return 'world';
}

/** 基于 target_name 与 context 名做 target_agent_id 精确绑定 */
export function resolveTargetAgentId(
  item: ExtractResult,
  ctx: ClassifyContext,
  layer: MemoryLayer,
  candidates: Array<{ agentId: string; name: string }>
): string | undefined {
  if (layer !== 'other') return undefined;
  // 如果 classifier 已有明确 targetId，先保留
  let chosenId = ctx.targetId;
  let chosenName = ctx.targetName;

  const tName = item.target_name;
  if (tName) {
    for (const c of candidates) {
      if (namesMatch(tName, c.name)) {
        chosenId = c.agentId;
        chosenName = c.name;
        break;
      }
    }
  }
  // 还没命中 → 优先用 peerName 匹配
  if (!chosenId && ctx.targetName) {
    for (const c of candidates) {
      if (namesMatch(ctx.targetName, c.name)) {
        chosenId = c.agentId;
        chosenName = c.name;
        break;
      }
    }
  }
  return chosenId;
}

/** 根据记忆来源计算置信度 */
export function computeConfidence(
  sourceType: MemorySource,
): number {
  switch (sourceType) {
    case 'dialogue':        return 0.9;
    case 'letter_receive':  return 0.7;
    case 'letter_send':     return 0.6;
    default:                return 0.5;
  }
}
