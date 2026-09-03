import { config } from '../config.js';
import { logger } from './logger.js';
import type { Agent, MemoryItem, ChatMessage } from '@meta-world/shared';

export interface BuildPromptParams {
  agent: Agent;
  history: ChatMessage[];
  memories: MemoryItem[];
  userMessage: string;
}

export function buildPrompt(p: BuildPromptParams) {
  const system = `你是一个名为"${p.agent.name}"的 AI 助手。
你的性格特质：${p.agent.persona_tags.join(', ')}
请用自然、温暖的语气与用户对话。引用过往记忆时请自然融入，不要提及"根据我的记忆"之类的话。`;

  const memoryBlock = p.memories.length
    ? `【过往记忆，供你参考】\n${p.memories.map(m => `- ${m.content}`).join('\n')}`
    : '';

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
  ];

  // 把最近历史按 user/assistant 交替加进去
  for (const m of p.history) {
    messages.push({ role: m.role, content: m.content });
  }

  // 最后一条：记忆参考 + 当前用户消息
  if (memoryBlock) {
    messages.push({ role: 'user', content: `${memoryBlock}\n\n${p.userMessage}` });
  } else {
    messages.push({ role: 'user', content: p.userMessage });
  }

  return messages;
}

/** 非流式调用 */
export async function llmChat(messages: ReturnType<typeof buildPrompt>): Promise<string> {
  const url = `${config.llm.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'LLM API error');
    throw new Error(`LLM API failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  return json.choices[0].message.content as string;
}

/**
 * 流式调用 —— 返回一个 AsyncIterable<string>，每 yield 一个 token 片段
 */
export async function* llmStream(messages: ReturnType<typeof buildPrompt>): AsyncGenerator<string> {
  const url = `${config.llm.baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = res.body ? await res.text() : 'no body';
    logger.error({ status: res.status, err }, 'LLM stream API error');
    throw new Error(`LLM stream API failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略解析失败的行
      }
    }
  }
}
