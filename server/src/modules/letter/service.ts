import { agentRepo } from '../../db/repositories/agent.repo.js';
import { letterRepo } from '../../db/repositories/letter.repo.js';
import { letterProcessLogRepo } from '../../db/repositories/letter-process-log.repo.js';
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
    // v0.3.0: 清空旧日志
    letterProcessLogRepo.clearByLetter(id);
    setImmediate(() => {
      processLetter(id).catch(err =>
        logger.error(err, `reprocessLetter failed: ${id}`)
      );
    });
  },

  /** v0.3.0: 查询已发送信件 */
  listSent(agentId: string) {
    return letterRepo.listSent(agentId);
  },

  /**
   * v0.3.0: 查询信件处理日志
   * 归属校验：发件方或收件方任一归属于当前用户即可
   */
  getLogs(letterId: string, userId: string) {
    const letter = letterRepo.getById(letterId);
    if (!letter) return null;

    // 归属检查
    const fromAgent = agentRepo.getById(letter.from_agent_id);
    const toAgent = agentRepo.getById(letter.to_agent_id);
    const isOwner =
      (fromAgent && fromAgent.owner_user_id === userId) ||
      (toAgent && toAgent.owner_user_id === userId);
    if (!isOwner) return null;

    // 查日志 + 补充信件概要
    const logs = letterProcessLogRepo.listByLetter(letterId);
    return {
      letter: {
        letter_id: letter.letter_id,
        from_name: fromAgent?.name || '(已删除)',
        to_name: toAgent?.name || '(已删除)',
        subject: letter.subject,
        status: letter.status,
        sent_at: letter.sent_at,
      },
      logs: logs.map(l => ({
        seq: l.seq,
        event_type: l.event_type,
        detail: l.detail ? JSON.parse(l.detail) : null,
        created_at: l.created_at,
      })),
    };
  },
};
