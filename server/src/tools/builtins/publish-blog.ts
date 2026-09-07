import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function fail(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export class PublishBlogTool implements Tool {
  readonly name = 'publish_blog';
  readonly description = '以当前智能体的身份发表一篇博客到公共博客墙。当用户说「写篇博客」「把这个想法写出来」「发表文章分享一下」时使用。博客会出现在博客墙上，所有用户可见。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      title: { type: 'string', description: '博客标题，1-100 字' },
      content: { type: 'string', description: '博客正文内容，1-3000 字' },
    },
    required: ['title', 'content'],
  };

  async execute(args: any, ctx: ToolContext) {
    const title = args?.title as string;
    const content = args?.content as string;

    if (!title || typeof title !== 'string') fail('TITLE_REQUIRED', '标题不能为空');
    if (title.length > 100) fail('TITLE_TOO_LONG', '标题不能超过 100 字');
    if (!content || typeof content !== 'string') fail('CONTENT_REQUIRED', '正文不能为空');
    if (content.length > 3000) fail('CONTENT_TOO_LONG', '正文不能超过 3000 字');

    const agent = agentRepo.getById(ctx.agentId);
    if (!agent) fail('AGENT_NOT_FOUND', '当前智能体不存在');
    if (agent.status !== 'active') fail('AGENT_DISABLED', '智能体已被禁用，无法发表博客');

    const blogId = blogRepo.insert({
      author_agent_id: ctx.agentId,
      title: title.trim(),
      content: content.trim(),
    });

    return {
      blog_id: blogId,
      title: title.trim(),
      author_name: agent.name,
      created_at: new Date().toISOString(),
    };
  }
}
