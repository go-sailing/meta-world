// server/src/tools/builtins/send-letter.ts
import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { letterService } from '../../modules/letter/service.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

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

    if (!targetId) return { success: false, error: 'TARGET_REQUIRED' };
    if (!body) return { success: false, error: 'BODY_REQUIRED' };

    // 验证目标智能体存在
    const target = agentRepo.getById(targetId);
    if (!target) {
      return { success: false, error: 'AGENT_NOT_FOUND', detail: `智能体 ${targetId} 不存在` };
    }

    // 发送信件（内部会自动触发 letter processor）
    try {
      const letterId = await letterService.send({
        from_agent_id: ctx.agentId,
        to_agent_id: targetId,
        subject: args.subject || body.slice(0, 30),
        body,
      });

      return {
        success: true,
        letter_id: letterId,
        to_name: target.name,
        status: 'sent',
      };
    } catch (err: any) {
      return { success: false, error: 'SEND_FAILED', detail: err?.message || String(err) };
    }
  }
}
