import { agentRepo, type AgentRow } from '../../db/repositories/agent.repo.js';
import { letterRepo } from '../../db/repositories/letter.repo.js';

const MAX_AGENTS_PER_USER = 10;

export const agentService = {
  create(
    req: { name: string; persona_tags: string[]; is_public?: boolean },
    userId: string
  ) {
    const count = agentRepo.countByUser(userId);
    if (count >= MAX_AGENTS_PER_USER) {
      throw { code: 'AGENT_LIMIT_EXCEEDED' };
    }
    if (agentRepo.hasNameConflict(userId, req.name)) {
      throw { code: 'AGENT_NAME_DUPLICATE' };
    }
    return agentRepo.create({
      owner_user_id: userId,
      name: req.name,
      persona_tags: req.persona_tags,
      is_public: req.is_public ?? false,
    });
  },

  listMine(userId: string) {
    const rows = agentRepo.listByUser(userId);
    return rows.map((row: AgentRow) => ({
      agent_id: row.agent_id,
      name: row.name,
      persona_tags: row.persona_tags,
      is_public: row.is_public,
      created_at: row.created_at,
      status: row.status,
      unread_count: letterRepo.countUnreadForAgent(row.agent_id),
    }));
  },

  discover(keyword?: string, page = 1, size = 20) {
    const { rows, total } = agentRepo.listPublic(keyword, page, size);
    return {
      total,
      page,
      size,
      items: rows.map(r => ({
        agent_id: r.agent_id,
        name: r.name,
        persona_tags: r.persona_tags,
        owner_email: maskEmail(r.owner_email || ''),
        created_at: r.created_at,
      })),
    };
  },

  getById(id: string) {
    return agentRepo.getById(id);
  },

  update(agentId: string, patch: any, userId: string) {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };

    if (patch.name && agentRepo.hasNameConflict(userId, patch.name, agentId)) {
      throw { code: 'AGENT_NAME_DUPLICATE' };
    }

    agentRepo.update(agentId, patch);
    return agentRepo.getById(agentId)!;
  },

  disable(agentId: string) {
    agentRepo.disable(agentId);
  },

  enable(agentId: string) {
    agentRepo.enable(agentId);
  },

  hardDelete(agentId: string) {
    agentRepo.hardDelete(agentId);
  },
};

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  if (name.length <= 1) return `*@${domain}`;
  return `${name.charAt(0)}***@${domain}`;
}
