import { letterRepo } from '../../db/repositories/letter.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { extractAndStore } from '../memory/service.js';
import { llmChat } from '../../utils/llm.js';
import { logger } from '../../utils/logger.js';
import type { Letter } from '@meta-world/shared';

interface ProcessOptions {
  /** 是否跳过"是否回复"的判断（用于 reply-to 场景，防止递归） */
  skipReplyDecision?: boolean;
}

/** DEMO 简化规则：包含问号或请求语气的信件默认触发回复 */
async function decideShouldReply(letter: Letter): Promise<boolean> {
  const hasQuestion = /[?？]/.test(letter.body);
  const hasRequest = /(请|能否|可以吗|帮我|希望|请求|please|could you|can you|would you)/i.test(letter.body);
  return hasQuestion || hasRequest;
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
  const letter = letterRepo.getById(letterId);
  if (!letter) return;

  logger.info({ letterId, skipReply: opts.skipReplyDecision }, 'Processing letter');

  letterRepo.updateStatus(letterId, 'processing');

  try {
    // 1. 记忆抽取
    await extractAndStore({
      agentId: letter.to_agent_id,
      sourceType: 'letter_receive',
      sourceId: letter.letter_id,
      targetAgentId: letter.from_agent_id,
      text: letter.body,
    });

    // 2. 判断是否回复（reply-to 跳过）
    if (!opts.skipReplyDecision) {
      const shouldReply = await decideShouldReply(letter);

      if (shouldReply) {
        logger.info({ letterId }, 'Will auto-reply');
        const replyBody = await generateReply(letter);
        if (replyBody.trim()) {
          // 投递回复（带 reply_to + _skipAutoReply，service 会识别并跳过递归）
          const replyLetterId = await import('./service.js').then(m =>
            m.letterService.send({
              from_agent_id: letter.to_agent_id,
              to_agent_id: letter.from_agent_id,
              subject: letter.subject ? `Re: ${letter.subject}` : undefined,
              body: replyBody,
              reply_to: letter.letter_id,
              _skipAutoReply: true,
            })
          );

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
          letterRepo.updateStatus(letterId, 'done');
        }
      } else {
        logger.info({ letterId }, 'No reply needed');
        letterRepo.updateStatus(letterId, 'done');
      }
    } else {
      letterRepo.updateStatus(letterId, 'done');
    }

    letterRepo.markProcessed(letterId);
  } catch (err) {
    logger.error({ letterId, err: (err as Error).message }, 'Letter processing failed');
    letterRepo.updateStatus(letterId, 'processing_failed');
  }
}
