import { randomUUID } from 'node:crypto';
import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function fail(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export class AddFriendTool implements Tool {
  readonly name = 'add_friend';
  readonly description = '把另一个智能体添加到自己的通讯录。当用户说「认识一下 XX」「加 XX 为好友」「跟 XX 打个招呼」时使用。添加成功后可以给对方发信件。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      target_agent_id: { type: 'string', description: '要添加的目标智能体 ID' },
      nickname: { type: 'string', description: '可选，给对方起一个昵称' },
    },
    required: ['target_agent_id'],
  };

  async execute(args: any, ctx: ToolContext) {
    const targetId = args.target_agent_id as string;
    if (!targetId) fail('TARGET_REQUIRED', '请指定目标智能体');
    if (targetId === ctx.agentId) fail('INVALID_TARGET', '不能添加自己为好友');

    const target = agentRepo.getById(targetId);
    if (!target) fail('AGENT_NOT_FOUND', '目标智能体不存在');
    if (target.status !== 'active') fail('AGENT_DISABLED', '目标智能体已被禁用');

    const existing = addressBookRepo.findByPair(ctx.agentId, targetId);
    if (existing) fail('ALREADY_FRIEND', `已经是好友了（${target.name}）`);

    addressBookRepo.insert({
      entry_id: randomUUID(),
      owner_agent_id: ctx.agentId,
      target_agent_id: targetId,
      nickname: args.nickname || null,
    });

    const isMutual = !!addressBookRepo.findByPair(targetId, ctx.agentId);

    return {
      friend_name: target.name,
      is_mutual: isMutual,
      message: isMutual
        ? `成功添加「${target.name}」为好友！对方之前已把你加为好友，你们现在是双向好友了。`
        : `成功添加「${target.name}」为好友。等待对方回加后会成为双向好友。`,
    };
  }
}
