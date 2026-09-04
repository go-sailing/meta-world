import { llmChat } from '../../utils/llm.js';
import { logger } from '../../utils/logger.js';

export interface ExtractResult {
  content: string;
  tentative_layer: 'self' | 'world' | 'other';
  /** 当 tentative_layer=other 时，这条记忆描述的是哪个目标主体的名字（用于反校绑定） */
  target_name?: string;
}

export interface ExtractContext {
  /** 记忆所属智能体（owner）名字 */
  ownerName: string;
  /** 文本作者的身份名（对话中是用户=人类，来信中是对端智能体，自己发信是 owner）；"我"指此人 */
  authorName: string;
  /** 是否人类作者：对话场景中为 true，信场景中为 false */
  isHumanAuthor: boolean;
  /** 信件/对话的对端主体名（非 owner）。对于收到的来信=发件人；对于发出的信=收件人；对话场景=用户 */
  peerName?: string;
}

const EXTRACT_SYSTEM_PROMPT = (ctx: ExtractContext) => `你是一个"记忆抽取器"。你的任务是从给定文本中识别可以沉淀的**记忆点**。这些记忆属于【${ctx.ownerName}】的知识体系。

## 身份上下文（关键！务必严格对应）
- 文本作者 = ${ctx.authorName}（${ctx.isHumanAuthor ? '人类用户' : 'AI 智能体'}）。文本里的"我/自己/本人"指作者本人。
- 智能体本身（记忆 owner）= ${ctx.ownerName}。如果文本里明确提到"${ctx.ownerName}"或者从上下文可以判断是在描述 ${ctx.ownerName}，这类记忆才是 self。
${ctx.peerName ? `- 对端互动对象 = ${ctx.peerName}。如果文本是在描述/介绍 ${ctx.peerName}，这些记忆属于 other 层（目标=${ctx.peerName}）。` : ''}

## 识别标准（从文本中直接抽取，不要推理）
- 用户/作者明确表达的偏好、经历、个人信息
- 智能体本人（即 ${ctx.ownerName}）的自我描述、性格、能力
- 明确的外部事实、常识、事件
- 对其他具体主体的描述、印象、特征（把对方名字写进 target_name）

忽略：寒暄、客套话、明显不真实的内容、纯提问。

## tentative_layer 规则（请据此逐条选）
- self: 关于记忆 owner（即 ${ctx.ownerName}）本人的信息（作者明确说"你是…"、"${ctx.ownerName}是…"、"你的性格…"）
- other: 关于特定主体（作者本人/对端/提到的第三人）。如果"我是XXX"且作者=${ctx.authorName}≠${ctx.ownerName} → 不是 self，是 other（目标=${ctx.authorName}）。
- world: 关于外部世界的客观事实或常识（不属于具体某个人）

## 输出
**严格**输出 JSON 数组，不要任何其他文字。other 层时必须填 target_name（可以是 ${ctx.authorName}、${ctx.ownerName}、${ctx.peerName || ''} 或文中出现的具体人名）：
[
  {"content": "简洁的自然语言描述（主语清晰，不要用代词）", "tentative_layer": "self"},
  {"content": "...", "tentative_layer": "other", "target_name": "这里填对方名字"}
]`;

export async function extractMemoryPoints(
  text: string,
  ctx: ExtractContext
): Promise<ExtractResult[]> {
  if (!text.trim()) return [];

  try {
    const result = await llmChat([
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT(ctx) },
      { role: 'user', content: text },
    ]);

    // 解析 JSON，处理可能的 markdown code fence
    let cleaned = result.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((e: any) => e && typeof e.content === 'string' && e.content.trim())
      .map((e: any) => ({
        content: e.content.trim().slice(0, 500),
        tentative_layer: (
          (e.tentative_layer === 'self' ||
            e.tentative_layer === 'world' ||
            e.tentative_layer === 'other')
            ? e.tentative_layer
            : 'world'
        ) as 'self' | 'world' | 'other',
        target_name: (typeof e.target_name === 'string' && e.target_name.trim())
          ? e.target_name.trim()
          : undefined,
      }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Memory extraction failed, returning empty');
    return [];
  }
}
