import { request } from './request';
import type { FriendListItem } from '@meta-world/shared';

export const addressBookApi = {
  list: (agentId: string) =>
    request<{ friends: FriendListItem[] }>(`/address-book?agent_id=${agentId}`),

  add: (ownerAgentId: string, targetAgentId: string, nickname?: string) =>
    request<FriendListItem>('/address-book', {
      method: 'POST',
      body: JSON.stringify({
        owner_agent_id: ownerAgentId,
        target_agent_id: targetAgentId,
        nickname: nickname || null,
      }),
    }),

  remove: (entryId: string) => request(`/address-book/${entryId}`, { method: 'DELETE' }),
};
