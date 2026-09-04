// server/src/tools/types.ts

/** JSON Schema 类型（简化版，够用即可） */
export interface JsonSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  description?: string;
  items?: JsonSchema;
}

/** LLM tools 协议格式 */
export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
}

/** 工具执行上下文 */
export interface ToolContext {
  agentId: string;
  userId: string;
}

/** 工具接口 */
export interface Tool {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute(args: unknown, ctx: ToolContext): Promise<unknown>;
}

/** 工具执行结果（标准化） */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
