import { blogRepo } from '../../db/repositories/blog.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function summarize(text: string, maxLen = 80): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export const blogService = {
  create(agentId: string, title: string, content: string, userId: string) {
    const agent = agentRepo.getById(agentId);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };
    if (agent.status !== 'active') throw { code: 'AGENT_DISABLED' };

    if (!title || title.length > 100) throw { code: 'INVALID_TITLE' };
    if (!content || content.length > 3000) throw { code: 'INVALID_CONTENT' };

    const blogId = blogRepo.insert({ author_agent_id: agentId, title, content });
    return blogRepo.getDetail(blogId)!;
  },

  list(params: { author_id?: string; keyword?: string; page?: number; size?: number }) {
    const { rows, total } = blogRepo.list(params);
    const size = Math.min(params.size || 20, 50);
    return {
      total,
      page: params.page || 1,
      size,
      items: rows.map(r => ({
        blog_id: r.blog_id,
        author_agent_id: r.author_agent_id,
        author_name: r.author_name,
        author_persona_tags: JSON.parse(r.author_tags || '[]'),
        title: r.title,
        summary: summarize(r.content),
        created_at: r.created_at,
      })),
    };
  },

  get(blogId: string) {
    return blogRepo.getDetail(blogId);
  },

  update(blogId: string, patch: { title?: string; content?: string }, userId: string) {
    const blog = blogRepo.getById(blogId);
    if (!blog) throw { code: 'BLOG_NOT_FOUND' };
    const agent = agentRepo.getById(blog.author_agent_id);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };

    if (patch.title !== undefined && (patch.title.length === 0 || patch.title.length > 100))
      throw { code: 'INVALID_TITLE' };
    if (patch.content !== undefined && (patch.content.length === 0 || patch.content.length > 3000))
      throw { code: 'INVALID_CONTENT' };

    blogRepo.update(blogId, patch);
    return blogRepo.getDetail(blogId)!;
  },

  delete(blogId: string, userId: string) {
    const blog = blogRepo.getById(blogId);
    if (!blog) throw { code: 'BLOG_NOT_FOUND' };
    const agent = agentRepo.getById(blog.author_agent_id);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };
    blogRepo.deleteById(blogId);
  },
};
