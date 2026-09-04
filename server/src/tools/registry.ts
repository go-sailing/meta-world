// server/src/tools/registry.ts
import type { Tool, LlmToolDefinition, ToolContext } from './types.js';
import { logger } from '../utils/logger.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /** 注册一个工具 */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
    logger.info(`Tool registered: ${tool.name}`);
  }

  /** 获取工具列表（LLM function calling 格式） */
  getLlmDefinitions(): LlmToolDefinition[] {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /** 获取所有工具名 */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** 查找工具（不执行） */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** 执行工具（带超时保护） */
  async execute(name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      logger.warn({ toolName: name }, 'Tool not found');
      return { success: false, error: `TOOL_NOT_FOUND: ${name}` };
    }

    // 30s 超时保护
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TOOL_TIMEOUT')), 30_000)
    );

    try {
      const result = await Promise.race([
        tool.execute(args, ctx),
        timeoutPromise,
      ]);
      return { success: true, data: result };
    } catch (err: any) {
      logger.error({ toolName: name, err }, 'Tool execution failed');
      return {
        success: false,
        error: err?.message || String(err),
      };
    }
  }
}

/** 单例导出 */
export const toolRegistry = new ToolRegistry();
