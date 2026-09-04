import type { FastifyRequest, FastifyReply } from 'fastify';
import { agentRepo } from '../db/repositories/agent.repo.js';
import { getAuthUser } from './auth.js';

interface OwnershipOptions {
  /** 是否跳过 agent status 检查（enabled/disabled）。
   *  用于 enable/disable 这类"状态自管理"路由——它们本身就是用来改变状态的，
   *  不能因为 agent 当前是 disabled 就把 enable 请求也拒了。 */
  skipStatusCheck?: boolean;
}

/**
 * 校验请求中的 agent_id 是否归属于当前登录用户。
 * 支持多种字段来源：params.agentId / query.agent_id / body.from_agent_id
 * 使用：route 的 preHandler 数组中传入
 */
export function verifyAgentOwnership(opts?: OwnershipOptions) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const params = req.params as { agentId?: string; id?: string };
    const query = req.query as { agent_id?: string };
    const body = req.body as any;

    const agentId =
      params.agentId ||
      params.id ||
      query.agent_id ||
      (body && (body.agent_id || body.from_agent_id || body.to_agent_id));

    if (!agentId) return;

    const agent = agentRepo.getById(agentId);
    if (!agent) {
      return reply.code(404).send({ error: 'AGENT_NOT_FOUND' });
    }
    if (agent.owner_user_id !== getAuthUser(req).sub) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: '无权操作该智能体' });
    }
    if (!opts?.skipStatusCheck && agent.status === 'disabled') {
      return reply.code(403).send({ error: 'AGENT_DISABLED', message: '该智能体已被禁用' });
    }
  };
}

/** 向后兼容：默认版本，检查归属 + 检查 enabled 状态 */
export const verifyAgentOwnershipDefault = verifyAgentOwnership();

/** 用于 enable/disable 路由的版本：只检查归属，不检查当前状态 */
export const verifyAgentOwnershipAnyStatus = verifyAgentOwnership({ skipStatusCheck: true });
