import type { CreateAgentRequest, Agent } from '@meta-world/shared';
import { agentRepo } from '../../db/repositories/agent.repo.js';

export const agentService = {
  create(req: CreateAgentRequest): Agent {
    return agentRepo.create(req);
  },

  getById(id: string): Agent | null {
    return agentRepo.getById(id);
  },
};
