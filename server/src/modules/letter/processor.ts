import { letterRepo } from '../../db/repositories/letter.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { letterProcessLogRepo } from '../../db/repositories/letter-process-log.repo.js';
import { extractAndStore } from '../memory/service.js';
import { llmChat } from '../../utils/llm.js';
import { logger } from '../../utils/logger.js';
import type { Letter } from '@meta-world/shared';

interface ProcessOptions {
  /** 是否跳过"是否回复"的判断（用于 reply-to 场景，防止递归） */
  skipReplyDecision?: boolean;
}

/** DEMO 简化规则：包含问号或请求语气的信件默认触发回复 */
async function decideShouldReply(letter: Letter): Promise<{ shouldReply: boolean; reason: string }> {
  const hasQuestion = /[?？]/.test(letter.body);
  const hasRequest = /(请|能否|可以吗|帮我|希望|请求|please|could you|can you|would you)/i.test(letter.body);
  const shouldReply = hasQuestion || hasRequest;
  const reason = hasQuestion ? '检测到问号' : hasRequest ? '检测到请求语气' : '无回复触发条件';
  return { shouldReply, reason };
}

async function generateReply(letter: Letter): Promise<string> {
  const toAgent = agentRepo.getById(letter.to_agent_id);
  const fromAgent = agentRepo.getById(letter.from_agent_id);
  if (!toAgent || !fromAgent) return '';

  const reply = await llmChat([
    {
      role: 'system',
      content: `你是"${toAgent.name}"，性格：${toAgent.persona_tags.join(', ')}。
你刚收到一封来自"${fromAgent.name}"的信，请用简洁自然的语气回信。`,
    },
    {
      role: 'user',
      content: `来信主题：${letter.subject || '(无)'}
来信内容：
${letter.body}

请回信：`,
    },
  ]);

  return reply;
}

export async function processLetter(letterId: string, opts: ProcessOptions = {}): Promise<void> {
  // 1. 记录：信件已接收
  letterProcessLogRepo.insert(letterId, 'letter_received');

  const letter = letterRepo.getById(letterId);
  if (!letter) {
    letterProcessLogRepo.insert(letterId, 'processing_error', { message: 'LETTER_NOT_FOUND' });
    return;
  }

  logger.info({ letterId, skipReply: opts.skipReplyDecision }, 'Processing letter');

  letterRepo.updateStatus(letterId, 'processing');

  try {
    // 2. 记录：调用 LLM（包含耗时信息）
    // 注意：当前简化版的 decideShouldReply 用的是 regex 规则而非真实 LLM，
    // 但我们仍记录 llm_called 事件以保持日志结构完整。
    const t0 = Date.now();

    // 3. 记忆抽取
    const memoryResult = await extractAndStore({
      agentId: letter.to_agent_id,
      sourceType: 'letter_receive',
      sourceId: letter.letter_id,
      targetAgentId: letter.from_agent_id,
      text: letter.body,
    });

    const t1 = Date.now();

    // 4. 记录：调用 LLM + 抽取记忆
    // 当前架构中记忆抽取和 decideShouldReply 都走同步/简化路径，
    // 这里用 memories_extracted 事件标记记忆抽取结果
    const extractedCount = Array.isArray(memoryResult) ? memoryResult.length : 0;
    letterProcessLogRepo.insert(letterId, 'llm_called', {
      latency_ms: t1 - t0,
      note: 'memory_extraction + decide_reply (regex rule)',
    });
    letterProcessLogRepo.insert(letterId, 'memories_extracted', {
      count: extractedCount,
    });

    // 5. 判断是否回复（reply-to 跳过）
    if (!opts.skipReplyDecision) {
      const { shouldReply, reason } = await decideShouldReply(letter);
      letterProcessLogRepo.insert(letterId, 'reply_decision', {
        should_reply: shouldReply,
        reason,
      });

      if (shouldReply) {
        logger.info({ letterId }, 'Will auto-reply');
        const replyBody = await generateReply(letter);
        if (replyBody.trim()) {
          // 投递回复（带 reply_to + _skipAutoReply，service 会识别并跳过递归）
          const letterService = await import('./service.js').then(m => m.letterService);
          const replyLetterId = await letterService.send({
            from_agent_id: letter.to_agent_id,
            to_agent_id: letter.from_agent_id,
            subject: letter.subject ? `Re: ${letter.subject}` : undefined,
            body: replyBody,
            reply_to: letter.letter_id,
            _skipAutoReply: true,
          });

          letterProcessLogRepo.insert(letterId, 'reply_sent', {
            reply_letter_id: replyLetterId,
          });

          // 回复信也产生记忆
          setImmediate(() => {
            extractAndStore({
              agentId: letter.to_agent_id,
              sourceType: 'letter_send',
              sourceId: replyLetterId,
              targetAgentId: letter.from_agent_id,
              text: replyBody,
            }).catch(err => logger.error(err, 'Reply memory extraction failed'));
          });

          letterRepo.updateStatus(letterId, 'replied');
        } else {
          letterProcessLogRepo.insert(letterId, 'reply_decision', {
            should_reply: true,
            reply_empty: true,
          });
          letterRepo.updateStatus(letterId, 'done');
        }
      } else {
        logger.info({ letterId }, 'No reply needed');
        letterRepo.updateStatus(letterId, 'done');
      }
    } else {
      letterProcessLogRepo.insert(letterId, 'reply_decision', {
        should_reply: false,
        reason: 'skipReplyDecision (reply-to scenario)',
      });
      letterRepo.updateStatus(letterId, 'done');
    }

    letterRepo.markProcessed(letterId);
  } catch (err) {
    logger.error({ letterId, err: (err as Error).message }, 'Letter processing failed');
    letterProcessLogRepo.insert(letterId, 'processing_error', {
      message: (err as Error)?.message || String(err),
    });
    letterRepo.updateStatus(letterId, 'processing_failed');
  }
}
