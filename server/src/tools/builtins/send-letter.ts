// server/src/tools/builtins/send-letter.ts
import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { letterService } from '../../modules/letter/service.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';

/** 抛出带中文消息的错误 */
function fail(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export class SendLetterTool implements Tool {
  readonly name = 'send_letter';
  readonly description = '向另一个智能体发送信件。用户说"帮我给XX发封信"、"写封信给XX"、"通知XX"时使用。目标智能体必须在通讯录中。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      target_agent_id: { type: 'string', description: '目标智能体 ID' },
      subject: { type: 'string', description: '信件主题（可选，默认从正文截取）' },
      body: { type: 'string', description: '信件正文内容' },
    },
    required: ['target_agent_id', 'body'],
  };

  async execute(args: any, ctx: ToolContext) {
    const targetId = args.target_agent_id;
    const body = args.body;

    if (!targetId) fail('TARGET_REQUIRED', '请指定目标智能体');
    if (!body) fail('BODY_REQUIRED', '信件正文不能为空');

    // 验证目标智能体存在
    const target = agentRepo.getById(targetId);
    if (!target) {
      fail('AGENT_NOT_FOUND', `目标智能体不存在（ID: ${targetId}）`);
    }

    // 检查通讯录
    const inBook = addressBookRepo.findByPair(ctx.agentId, targetId);
    if (!inBook) {
      fail('NOT_IN_ADDRESS_BOOK', `「${target.name}」不在通讯录中，请先添加到通讯录后再发送信件`);
    }

    // 发送信件
    try {
      const letterId = await letterService.send({
        from_agent_id: ctx.agentId,
        to_agent_id: targetId,
        subject: args.subject || body.slice(0, 30),
        body,
      });

      // 直接返回原始数据，不要 success 包装
      return { letter_id: letterId, to_name: target.name };
    } catch (err: any) {
      fail('SEND_FAILED', `发送失败：${err?.message || String(err)}`);
    }
  }
}
