import { config } from '../config.js';
import { logger } from './logger.js';
import type { Agent, MemoryItem, ChatMessage } from '@meta-world/shared';
import type { LlmToolDefinition } from '../tools/types.js';

export interface BuildPromptParams {
  agent: Agent;
  history: ChatMessage[];
  memories: MemoryItem[];
  userMessage: string;
}

/** LLM 响应结构（支持 tool_calls） */
export interface LlmResponse {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string; // JSON 字符串
    };
  }>;
}

export function buildPrompt(p: BuildPromptParams) {
  const system = `你是一个名为"${p.agent.name}"的 AI 助手。
你的性格特质：${p.agent.persona_tags.join(', ')}
请用自然、温暖的语气与用户对话。引用过往记忆时请自然融入，不要提及"根据我的记忆"之类的话。

# 重要：工具使用指南
当你的回复中包含可用工具（tools）时：
- 如果用户问题涉及**实时信息**（如当前时间、日期、天气等），你**必须**调用对应工具获取真实数据，绝不能凭知识猜测。
- 如果用户要求**文件操作**（如写文件、读文件、列出文件），你**必须**调用文件工具。
- 如果用户要求**给其他智能体发消息/信件**，你**必须**调用 send_letter 工具。
- 只有当你确定能凭已有知识准确回答时，才直接回答不调用工具。
- 调用工具后，根据工具返回的结果来生成最终回答，不要忽略工具结果。`;

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

/**
 * 非流式调用（支持 function calling）
 * 返回结构包含 content 和可选的 tool_calls
 */
export async function llmChatWithTools(
  messages: any[],
  tools?: LlmToolDefinition[]
): Promise<LlmResponse> {
  const url = `${config.llm.baseUrl}/chat/completions`;
  const body: any = {
    model: config.llm.model,
    messages,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'LLM API error (tools)');
    throw new Error(`LLM API failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const msg = json.choices[0].message;
  return {
    content: msg.content ?? null,
    tool_calls: msg.tool_calls,
  };
}
