// server/src/tools/index.ts
export { toolRegistry, ToolRegistry } from './registry.js';
export type { Tool, ToolContext, ToolResult, JsonSchema, LlmToolDefinition } from './types.js';

import { GetTimeTool } from './builtins/get-time.js';
import { FileReadTool, FileWriteTool, FileListTool, FileDeleteTool } from './builtins/file-tools.js';
import { SendLetterTool } from './builtins/send-letter.js';
import { toolRegistry } from './registry.js';

/** 启动时注册所有内置工具 */
export function registerAllTools() {
  toolRegistry.register(new GetTimeTool());
  toolRegistry.register(new FileReadTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileListTool());
  toolRegistry.register(new FileDeleteTool());
  toolRegistry.register(new SendLetterTool());
}
