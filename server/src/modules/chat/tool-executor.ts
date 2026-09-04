// server/src/modules/chat/tool-executor.ts
import { toolRegistry } from '../../tools/registry.js';
import { buildPrompt, llmChatWithTools } from '../../utils/llm.js';
import type { Agent, ChatMessage, MemoryItem } from '@meta-world/shared';
import { logger } from '../../utils/logger.js';

const MAX_TOOL_ROUNDS = 5;

export interface ToolStep {
  toolName: string;
  args: unknown;
  result: unknown;
}

/**
 * 执行完整的 tool-use 循环
 * 如果 LLM 没有调用工具，直接返回最终回答
 * 如果调用了工具，执行后将结果传回 LLM，循环直到获得最终回答
 */
export async function runToolLoop(
  agent: Agent,
  history: ChatMessage[],
  memories: MemoryItem[],
  userMessage: string,
  ctx: { agentId: string; userId: string }
): Promise<{ finalText: string; toolSteps: ToolStep[] }> {
  const tools = toolRegistry.getLlmDefinitions();
  const toolSteps: ToolStep[] = [];

  // 构建初始 messages
  let messages: any[] = buildPrompt({ agent, history, memories, userMessage });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response;
    try {
      response = await llmChatWithTools(messages, tools);
    } catch (err: any) {
      logger.error({ err }, 'LLM call failed in tool loop');
      // LLM 调用失败，用最后一条有效 content 或 fallback
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      return {
        finalText: '抱歉，我在思考时遇到了问题，请稍后再试。',
        toolSteps,
      };
    }

    // 如果没有 tool_calls，直接返回最终回答
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return { finalText: response.content || '', toolSteps };
    }

    logger.info({ round, toolCalls: response.tool_calls.map(t => t.function.name) }, 'LLM requested tool calls');

    // 将 assistant 的 tool_calls 消息加入历史
    const assistantMsg: any = {
      role: 'assistant',
      content: response.content || null,
      tool_calls: response.tool_calls,
    };
    messages.push(assistantMsg);

    // 依次执行每个 tool_call
    for (const tc of response.tool_calls) {
      let args: unknown;
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        args = {};
      }

      const result = await toolRegistry.execute(
        tc.function.name,
        args,
        { agentId: ctx.agentId, userId: ctx.userId }
      );

      toolSteps.push({
        toolName: tc.function.name,
        args,
        result,
      });

      logger.info({ tool: tc.function.name, success: (result as any)?.success }, 'Tool executed');

      // 加入 tool 消息（按 OpenAI 协议格式）
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  // 超过最大轮次，强制返回最后一条 assistant 内容
  logger.warn({ rounds: MAX_TOOL_ROUNDS }, 'Tool loop exceeded max rounds');
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  return {
    finalText: lastAssistant?.content || '抱歉，我在处理时陷入了循环，请换个方式问我。',
    toolSteps,
  };
}
