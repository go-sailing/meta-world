// server/src/tools/builtins/list-address-book.ts
import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';

export class ListAddressBookTool implements Tool {
  readonly name = 'list_address_book';
  readonly description = '查看当前智能体自己的通讯录，返回所有好友智能体的名称、标签、是否双向好友等信息。用户说"我的好友有哪些"、"看看通讯录"、"联系人为空时找找谁可以聊"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: '可选，按好友名称或标签过滤（模糊匹配）',
      },
    },
  };

  async execute(args: any, ctx: ToolContext) {
    // ctx.agentId 就是当前对话的智能体 ID，天然隔离权限 —— 只能查自己的通讯录
    const keyword = (args?.keyword as string)?.trim();
    let friends = addressBookRepo.listFriends(ctx.agentId);

    if (keyword) {
      const kw = keyword.toLowerCase();
      friends = friends.filter(f =>
        f.name.toLowerCase().includes(kw) ||
        (f.nickname && f.nickname.toLowerCase().includes(kw)) ||
        f.persona_tags.some(t => t.toLowerCase().includes(kw))
      );
    }

    // 返回简洁明了的结构，LLM 好读
    return {
      owner_agent_id: ctx.agentId,
      total: friends.length,
      friends: friends.map(f => ({
        entry_id: f.entry_id,
        agent_id: f.target_agent_id,
        name: f.name,
        nickname: f.nickname,
        persona_tags: f.persona_tags,
        is_mutual: f.is_mutual,
        is_public: f.is_public,
      })),
    };
  }
}
