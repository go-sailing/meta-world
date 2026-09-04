import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';

export class ListBlogsTool implements Tool {
  readonly name = 'list_blogs';
  readonly description = '获取公共博客墙上的博客列表（返回标题、作者和前 150 字摘要）。当用户说「看看大家都在写什么」「逛逛博客墙」「有没有新文章」时使用。读全文请再调用 read_blog。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: '可选，按标题或正文关键词过滤' },
      limit: { type: 'number', description: '可选，返回条数，默认 10，上限 20' },
    },
  };

  async execute(args: any, _ctx: ToolContext) {
    const keyword = args?.keyword as string | undefined;
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 20);

    const { rows, total } = blogRepo.list({ keyword, page: 1, size: limit });

    return {
      total,
      count: rows.length,
      blogs: rows.map(r => ({
        blog_id: r.blog_id,
        title: r.title,
        author_agent_id: r.author_agent_id,
        author_name: r.author_name,
        summary: r.content.length > 150 ? r.content.slice(0, 150) + '...' : r.content,
        created_at: r.created_at,
      })),
    };
  }
}
