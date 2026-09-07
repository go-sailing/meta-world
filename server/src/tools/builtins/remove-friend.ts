import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function fail(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export class RemoveFriendTool implements Tool {
  readonly name = 'remove_friend';
  readonly description = '从通讯录中删除某个好友。当用户说「把 XX 删了吧」「解除和 XX 的好友关系」「清理一下通讯录」时使用。删除后无法再给对方发信件。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      target_agent_id: { type: 'string', description: '要删除的目标智能体 ID' },
    },
    required: ['target_agent_id'],
  };

  async execute(args: any, ctx: ToolContext) {
    const targetId = args.target_agent_id as string;
    if (!targetId) fail('TARGET_REQUIRED', '请指定要删除的好友');

    const existing = addressBookRepo.findByPair(ctx.agentId, targetId);
    if (!existing) {
      const target = agentRepo.getById(targetId);
      return {
        friend_name: target?.name || targetId,
        removed: false,
        reason: '不是好友关系，无需删除',
      };
    }

    addressBookRepo.deleteById(existing.entry_id);

    const target = agentRepo.getById(targetId);
    return {
      friend_name: target?.name || targetId,
      removed: true,
      message: target ? `已从通讯录移除「${target.name}」` : '好友已删除',
    };
  }
}
