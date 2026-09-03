import { llmChat } from '../../utils/llm.js';
import { logger } from '../../utils/logger.js';

export interface ExtractResult {
  content: string;
  tentative_layer: 'self' | 'world' | 'other';
}

const EXTRACT_SYSTEM_PROMPT = `你是一个"记忆抽取器"。你的任务是从给定文本中识别可以沉淀的**记忆点**。

识别标准：
- 用户提到的个人信息、偏好、经历
- 智能体表达的自我描述（性格、能力、价值观）
- 外部事实、知识、事件
- 对其他主体的印象或观察

忽略：寒暄、无实质内容的套话、明显不真实的内容。

tentative_layer 判断标准：
- self: 关于智能体自己的（"我是..."、"我的性格是..."）
- world: 关于外部世界的事实或信息
- other: 关于某个特定主体（用户或另一个智能体）的

**严格**输出 JSON 数组，不要任何其他文字：
[
  {"content": "简洁的自然语言描述", "tentative_layer": "self"},
  {"content": "...", "tentative_layer": "world"}
]`;

export async function extractMemoryPoints(text: string): Promise<ExtractResult[]> {
  if (!text.trim()) return [];

  try {
    const result = await llmChat([
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
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
        tentative_layer: (e.tentative_layer as any) || 'world',
      }));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Memory extraction failed, returning empty');
    return [];
  }
}
