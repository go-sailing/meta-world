import { agentRepo } from '../../db/repositories/agent.repo.js';
import { chatRepo } from '../../db/repositories/chat.repo.js';
import { recallMemories } from './memory-recall.js';
import { buildPrompt, llmChat, llmStream } from '../../utils/llm.js';
import { extractAndStore } from '../memory/service.js';
import { logger } from '../../utils/logger.js';

export const chatService = {
  /** 非流式对话 */
  async sendMessage(agentId: string, userMessage: string): Promise<{
    reply: string;
    memory_refs: string[];
  }> {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw new Error('Agent not found');

    // 1. 查历史
    const history = chatRepo.getRecent(agentId, 20);

    // 2. 检索记忆（基于当前用户消息）
    const memories = await recallMemories(agentId, userMessage);

    // 3. 构造 prompt + 调 LLM
    const messages = buildPrompt({ agent, history, memories, userMessage });
    const reply = await llmChat(messages);

    // 4. 存对话消息
    chatRepo.insert(agentId, 'user', userMessage);
    chatRepo.insert(agentId, 'assistant', reply);

    // 5. 异步抽取记忆（不阻塞响应）
    const userMsgId = chatRepo.getRecent(agentId, 1)[0]?.msg_id;
    setImmediate(() => {
      extractAndStore({
        agentId,
        sourceType: 'dialogue',
        sourceId: userMsgId || agentId,
        text: userMessage + '\n' + reply,
      }).catch(err => logger.error(err, 'Async memory extraction failed'));
    });

    return {
      reply,
      memory_refs: memories.map(m => m.memory_id),
    };
  },

  /** 流式对话，返回 AsyncGenerator<string> */
  async *sendMessageStream(
    agentId: string,
    userMessage: string
  ): AsyncGenerator<string> {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw new Error('Agent not found');

    const history = chatRepo.getRecent(agentId, 20);
    const memories = await recallMemories(agentId, userMessage);
    const messages = buildPrompt({ agent, history, memories, userMessage });

    // 收集完整回复用于后续存储
    let fullReply = '';
    try {
      for await (const token of llmStream(messages)) {
        fullReply += token;
        yield token;
      }
    } finally {
      // 无论成功失败都存一下（有多少存多少）
      chatRepo.insert(agentId, 'user', userMessage);
      if (fullReply) {
        chatRepo.insert(agentId, 'assistant', fullReply);
        setImmediate(() => {
          extractAndStore({
            agentId,
            sourceType: 'dialogue',
            sourceId: agentId,
            text: userMessage + '\n' + fullReply,
          }).catch(err => logger.error(err, 'Async memory extraction failed'));
        });
      }
    }
  },
};
