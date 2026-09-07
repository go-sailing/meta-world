import { request } from './request';
import type { BlogListResponse, BlogPost } from '@meta-world/shared';

interface BlogDetail extends BlogPost {
  author_name: string;
  author_tags: string[];
}

export const blogApi = {
  list(params?: { author_id?: string; keyword?: string; page?: number; size?: number }) {
    return request<any, BlogListResponse>('/blogs', {
      method: 'GET',
      ...(params ? {} : {}),
    }) as Promise<BlogListResponse>;
  },

  get(id: string) {
    return request<any, BlogDetail>(`/blogs/${id}`, { method: 'GET' }) as Promise<BlogDetail>;
  },

  create(data: { agent_id: string; title: string; content: string }) {
    return request<any, BlogDetail>('/blogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<BlogDetail>;
  },

  update(id: string, data: { title?: string; content?: string }) {
    return request<any, BlogDetail>(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<BlogDetail>;
  },

  delete(id: string) {
    return request<void>(`/blogs/${id}`, { method: 'DELETE' });
  },
};
