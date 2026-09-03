import { request } from './request';
import type { Agent, AgentListItem, DiscoverAgentItem } from '@meta-world/shared';

export const agentApi = {
  create: (data: { name: string; persona_tags: string[]; is_public?: boolean }) =>
    request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMine: () => request<{ agents: AgentListItem[] }>('/agents'),

  get: (id: string) => request<Agent>(`/agents/${id}`),

  update: (id: string, data: any) =>
    request<Agent>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  disable: (id: string) => request(`/agents/${id}/disable`, { method: 'PUT' }),

  hardDelete: (id: string) => request(`/agents/${id}`, { method: 'DELETE' }),

  discover: (params: { keyword?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.keyword) qs.set('keyword', params.keyword);
    if (params.page) qs.set('page', String(params.page));
    if (params.size) qs.set('size', String(params.size));
    return request<{ total: number; page: number; size: number; items: DiscoverAgentItem[] }>(
      `/agents/discover?${qs}`
    );
  },
};
