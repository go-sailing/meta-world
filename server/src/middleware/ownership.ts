import type { FastifyRequest, FastifyReply } from 'fastify';
import { agentRepo } from '../db/repositories/agent.repo.js';
import { getAuthUser } from './auth.js';

/**
 * 校验请求中的 agent_id 是否归属于当前登录用户。
 * 支持多种字段来源：params.agentId / query.agent_id / body.from_agent_id
 * 使用：route 的 preHandler 数组中传入
 */
export async function verifyAgentOwnership(
  req: FastifyRequest,
  reply: FastifyReply
) {
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
  if (agent.status === 'disabled') {
    return reply.code(403).send({ error: 'AGENT_DISABLED', message: '该智能体已被禁用' });
  }
}
