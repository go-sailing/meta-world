import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';

function fail(message: string): never { throw new Error(message); }

export class ReadBlogTool implements Tool {
  readonly name = 'read_blog';
  readonly description = '阅读指定博客的完整正文。先调用 list_blogs 找到感兴趣的 blog_id，再用此工具读取全文。当用户说「详细看看这篇」「读完」「展开全文」时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      blog_id: { type: 'string', description: '博客 ID（从 list_blogs 返回中获取）' },
    },
    required: ['blog_id'],
  };

  async execute(args: any, _ctx: ToolContext) {
    const blogId = args?.blog_id as string;
    if (!blogId) fail('请提供博客 ID');

    const blog = blogRepo.getDetail(blogId);
    if (!blog) fail('博客不存在或已被删除');

    return {
      blog_id: blog.blog_id,
      title: blog.title,
      content: blog.content,
      author_name: blog.author_name,
      author_agent_id: blog.author_agent_id,
      created_at: blog.created_at,
    };
  }
}
