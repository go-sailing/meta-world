import { agentRepo } from '../../db/repositories/agent.repo.js';
import { chatRepo } from '../../db/repositories/chat.repo.js';
import { recallMemories } from './memory-recall.js';
import { runToolLoop, ToolStep } from './tool-executor.js';
import { extractAndStore } from '../memory/service.js';
import { logger } from '../../utils/logger.js';

export interface StreamChunk {
  type: 'tokens' | 'tools' | 'done';
  data?: string | ToolStep[];
  memory_refs?: string[];
}

export const chatService = {
  /** 非流式对话（支持工具） */
  async sendMessage(agentId: string, userMessage: string, userId?: string): Promise<{
    reply: string;
    memory_refs: string[];
    tool_steps: ToolStep[];
  }> {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw new Error('Agent not found');

    const history = chatRepo.getRecent(agentId, 20);
    const memories = await recallMemories(agentId, userMessage);

    const { finalText, toolSteps } = await runToolLoop(
      agent, history, memories, userMessage,
      { agentId, userId: userId || 'unknown' }
    );

    // 存对话
    chatRepo.insert(agentId, 'user', userMessage);
    chatRepo.insert(agentId, 'assistant', finalText);

    // 异步抽取记忆
    const userMsgId = chatRepo.getRecent(agentId, 1)[0]?.msg_id;
    setImmediate(() => {
      extractAndStore({
        agentId,
        sourceType: 'dialogue',
        sourceId: userMsgId || agentId,
        text: userMessage + '\n' + finalText,
      }).catch(err => logger.error(err, 'Async memory extraction failed'));
    });

    return {
      reply: finalText,
      memory_refs: memories.map(m => m.memory_id),
      tool_steps: toolSteps,
    };
  },

  /**
   * 流式对话（支持工具）
   * 先发 tools 事件（如果有），再逐 token 发最终回答
   */
  async *sendMessageStream(
    agentId: string,
    userMessage: string,
    userId?: string
  ): AsyncGenerator<StreamChunk> {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw new Error('Agent not found');

    const history = chatRepo.getRecent(agentId, 20);
    const memories = await recallMemories(agentId, userMessage);

    // 跑 tool loop（非流式获取最终文本 + 工具步骤）
    const { finalText, toolSteps } = await runToolLoop(
      agent, history, memories, userMessage,
      { agentId, userId: userId || 'unknown' }
    );

    // 如果有工具调用，先发 tools 事件
    if (toolSteps.length > 0) {
      yield { type: 'tools', data: toolSteps };
    }

    // 逐 token 流式发送最终回答
    // 使用简单的字符级 token 拆分（每个中文字算一个 token，英文单词算一个）
    const tokens = tokenize(finalText);
    for (const token of tokens) {
      yield { type: 'tokens', data: token };
    }

    // done 事件
    yield { type: 'done', memory_refs: memories.map(m => m.memory_id) };

    // 存对话（在 generator 结束时）
    chatRepo.insert(agentId, 'user', userMessage);
    if (finalText) {
      chatRepo.insert(agentId, 'assistant', finalText);
      const userMsgId = chatRepo.getRecent(agentId, 1)[0]?.msg_id;
      setImmediate(() => {
        extractAndStore({
          agentId,
          sourceType: 'dialogue',
          sourceId: userMsgId || agentId,
          text: userMessage + '\n' + finalText,
        }).catch(err => logger.error(err, 'Async memory extraction failed'));
      });
    }
  },
};

/** 简单 tokenizer：按字符切分，保持标点和空格 */
function tokenize(text: string): string[] {
  if (!text) return [];
  const result: string[] = [];
  let buffer = '';

  for (const char of text) {
    // 中文/日文等 CJK 字符算一个 token
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(char)) {
      if (buffer) { result.push(buffer); buffer = ''; }
      result.push(char);
    }
    // 标点符号也算一个 token
    else if (/[。！？，、；：""''（）…—.,!?;:()'"[\]{}]/.test(char)) {
      if (buffer) { result.push(buffer); buffer = ''; }
      result.push(char);
    }
    // 空格：如果 buffer 有内容，先输出
    else if (char === ' ') {
      if (buffer) { result.push(buffer); buffer = ''; }
      result.push(' ');
    }
    // 英文/数字：累加到 buffer
    else {
      buffer += char;
    }
  }
  if (buffer) result.push(buffer);
  return result;
}
