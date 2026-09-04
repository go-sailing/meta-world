import { randomUUID } from 'node:crypto';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

export const addressBookService = {
  list(ownerAgentId: string) {
    return addressBookRepo.listFriends(ownerAgentId);
  },

  add(
    input: { owner_agent_id: string; target_agent_id: string; nickname?: string },
    userId: string
  ) {
    const { owner_agent_id, target_agent_id } = input;

    const owner = agentRepo.getById(owner_agent_id);
    if (!owner || owner.owner_user_id !== userId) {
      throw { code: 'FORBIDDEN', message: '无权操作该智能体' };
    }
    if (owner_agent_id === target_agent_id) {
      throw { code: 'CANNOT_ADD_SELF', message: '不能把自己加进通讯录' };
    }

    const target = agentRepo.getById(target_agent_id);
    if (!target) {
      throw { code: 'AGENT_NOT_FOUND' };
    }
    if (target.status === 'disabled') {
      throw { code: 'AGENT_DISABLED', message: '目标智能体已被禁用' };
    }
    if (!target.is_public && target.owner_user_id !== userId) {
      throw { code: 'AGENT_PRIVATE', message: '该智能体是私有的' };
    }

    const exists = addressBookRepo.findByPair(owner_agent_id, target_agent_id);
    if (exists) {
      throw { code: 'ALREADY_IN_ADDRESS_BOOK' };
    }

    const count = addressBookRepo.count(owner_agent_id);
    if (count >= 100) {
      throw { code: 'ADDRESS_BOOK_FULL', message: '通讯录已满（100）' };
    }

    const entryId = randomUUID();
    addressBookRepo.insert({
      entry_id: entryId,
      owner_agent_id,
      target_agent_id,
      nickname: input.nickname || null,
    });

    // 返回完整条目（含双向标记）
    const friends = addressBookRepo.listFriends(owner_agent_id);
    return friends.find(f => f.entry_id === entryId)!;
  },

  remove(entryId: string, userId: string) {
    const entry = addressBookRepo.getById(entryId);
    if (!entry) {
      throw { code: 'ENTRY_NOT_FOUND', message: '通讯录条目不存在' };
    }
    const owner = agentRepo.getById(entry.owner_agent_id);
    if (!owner || owner.owner_user_id !== userId) {
      throw { code: 'FORBIDDEN' };
    }
    addressBookRepo.deleteById(entryId);
  },
};
