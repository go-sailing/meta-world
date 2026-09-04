import { request } from './request';
import type { MemoryListResponse } from '@meta-world/shared';

export interface MemoryListParams {
  agent_id: string;
  layer?: string;
  source?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export async function listMemories(params: MemoryListParams): Promise<MemoryListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  });
  return request<MemoryListResponse>(`/memory/list?${qs.toString()}`);
}
