import { agentRepo } from '../../db/repositories/agent.repo.js';
import { letterRepo } from '../../db/repositories/letter.repo.js';
import { processLetter } from './processor.js';
import { logger } from '../../utils/logger.js';
import type { SendLetterRequest } from '@meta-world/shared';

export const letterService = {
  async send(req: SendLetterRequest): Promise<string> {
    // 校验收发双方存在
    const from = agentRepo.getById(req.from_agent_id);
    const to = agentRepo.getById(req.to_agent_id);
    if (!from) throw new Error(`From agent ${req.from_agent_id} not found`);
    if (!to) throw new Error(`To agent ${req.to_agent_id} not found`);

    // 1. 写入 + 投递
    const letterId = letterRepo.insert(req);
    letterRepo.deliver(letterId);
    logger.info({ letterId, from: req.from_agent_id, to: req.to_agent_id }, 'Letter delivered');

    // 2. 触发收件智能体侧处理
    // 如果是 reply_to 的回复信 → 跳过自动回复决策（防止递归），但仍抽取记忆
    if (req.reply_to || req._skipAutoReply) {
      setImmediate(() => {
        processLetter(letterId, { skipReplyDecision: true }).catch(err =>
          logger.error(err, `processLetter (reply-to) failed: ${letterId}`)
        );
      });
    } else {
      setImmediate(() => {
        processLetter(letterId).catch(err =>
          logger.error(err, `processLetter failed: ${letterId}`)
        );
      });
    }

    return letterId;
  },

  listInbox(agentId: string) {
    return letterRepo.listInbox(agentId);
  },

  read(id: string) {
    letterRepo.markRead(id);
    return letterRepo.getById(id);
  },

  reprocess(id: string) {
    letterRepo.updateStatus(id, 'delivered');
    setImmediate(() => {
      processLetter(id).catch(err =>
        logger.error(err, `reprocessLetter failed: ${id}`)
      );
    });
  },
};
