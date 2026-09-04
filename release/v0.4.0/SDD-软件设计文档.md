# SDD：MetaAgent v0.4.0 — 软件设计文档

| 文档信息   | 内容                                         |
| ------ | ------------------------------------------ |
| 版本     | v0.4.0                                     |
| 日期     | 2026-09-04                                 |
| 状态     | 草稿                                         |
| 对应 PRD | [PRD-智能体产品设计文档 v0.4.0](./PRD-智能体产品设计文档.md) |
| 前置 SDD | v0.3.0                                     |

> **v0.3.0 → v0.4.0 变更说明**：核心变更为 Tool Registry 框架 + LLM function calling 改造。后端新增约 800 行代码（tools 模块），改造 chat 模块支持 function calling 循环。前端主要是 Chat.vue 工具调用卡片和整体界面简化，约 300 行改动。

***

## 1. 技术栈变更

### 1.1 无新增 npm 包

v0.4.0 不引入新依赖，复用现有技术栈。文件操作使用 Node.js 内置 `fs/promises`。

### 1.2 文件存储策略

| 项    | 说明                                  |
| ---- | ----------------------------------- |
| 存储位置 | `server/data/users/{userId}/files/` |
| 隔离策略 | 按 userId 分目录，文件工具强制限制在该目录内          |
| 编码   | UTF-8 文本                            |
| 大小限制 | 单文件 ≤ 1MB                           |

***

## 2. 目录结构

### 2.1 后端新增文件

```
server/src/
├── tools/                              ← 新增模块
│   ├── registry.ts                     ← ToolRegistry 核心
│   ├── types.ts                        ← Tool 接口定义
│   ├── index.ts                        ← 导出
│   └── builtins/
│       ├── get-time.ts                 ← 时间工具
│       ├── file-tools.ts               ← 文件读写工具
│       └── send-letter.ts              ← 发送信件工具
│
├── modules/
│   ├── chat/
│   │   ├── route.ts                    ← 改造：支持 tools
│   │   ├── service.ts                  ← 改造：function calling 循环
│   │   └── tool-executor.ts            ← 新增：工具执行编排
│
├── utils/
│   ├── llm.ts                          ← 改造：新增 function calling 支持
```

### 2.2 前端改造文件

```
web/src/
├── views/
│   ├── Chat.vue                        ← 改造：工具调用卡片 + 简洁化
│   ├── AgentList.vue                   ← 改造：去掉冗余
│   ├── CreateAgent.vue                 ← 改造：表单简洁化
│   ├── Mailbox.vue                     ← 改造：列表简洁化
│   ├── MemoryView.vue                  ← 改造：简化筛选器
│
├── components/
│   ├── ToolCallCard.vue                ← 新增：工具调用卡片组件
│
├── App.vue                             ← 改造：整体布局简洁化
```

***

## 3. Tool Registry 设计

### 3.1 类型定义

```typescript
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
```

### 3.2 ToolRegistry 实现

```typescript
// server/src/tools/registry.ts
import type { Tool, LlmToolDefinition, ToolContext } from './types.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /** 注册一个工具 */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
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

  /** 执行工具（带超时保护） */
  async execute(name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `TOOL_NOT_FOUND: ${name}` };
    }

    // 30s 超时
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TOOL_TIMEOUT')), 30_000)
    );

    try {
      const result = await Promise.race([
        tool.execute(args, ctx),
        timeout,
      ]);
      return { success: true, data: result };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
      };
    }
  }
}

/** 单例 */
export const toolRegistry = new ToolRegistry();
```

### 3.3 启动时注册

在 `server/src/index.ts` 的 bootstrap 中：

```typescript
// server/src/tools/index.ts
import { toolRegistry } from './registry.js';
import { GetTimeTool } from './builtins/get-time.js';
import { FileReadTool, FileWriteTool, FileListTool, FileDeleteTool } from './builtins/file-tools.js';
import { SendLetterTool } from './builtins/send-letter.js';

export function registerAllTools() {
  toolRegistry.register(new GetTimeTool());
  toolRegistry.register(new FileReadTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileListTool());
  toolRegistry.register(new FileDeleteTool());
  toolRegistry.register(new SendLetterTool());
}
```

***

## 4. 内置工具实现

### 4.1 get\_time 工具

```typescript
// server/src/tools/builtins/get-time.ts
import type { Tool, JsonSchema } from '../types.js';

export class GetTimeTool implements Tool {
  readonly name = 'get_time';
  readonly description = '获取当前时间、日期、星期、时区信息。用户问"几点了"、"今天几号"、"星期几"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: '返回格式：readable（默认）、iso、unix',
        enum: ['readable', 'iso', 'unix'],
      },
      timezone: {
        type: 'string',
        description: '时区，如 Asia/Shanghai，默认 Asia/Shanghai',
      },
    },
  };

  async execute(args: any) {
    const format = args?.format || 'readable';
    const tz = args?.timezone || 'Asia/Shanghai';
    const now = new Date();

    const iso = now.toISOString();
    const unix = Math.floor(now.getTime() / 1000);
    
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const readable = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (format === 'iso') return { datetime: iso, timezone: tz };
    if (format === 'unix') return { unix, timezone: tz };
    return { datetime: iso, readable, unix, timezone: tz };
  }
}
```

### 4.2 file\_\* 工具

```typescript
// server/src/tools/builtins/file-tools.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tool, JsonSchema, ToolContext } from '../types.js';

/** 获取用户沙箱目录，自动创建 */
function getUserSandbox(userId: string): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sandbox = path.resolve(__dirname, '../../../data/users', userId, 'files');
  fs.mkdir(sandbox, { recursive: true });
  return sandbox;
}

/** 安全路径解析（防止路径穿越） */
function safePath(sandbox: string, userPath: string): string | null {
  // 移除开头的 / 和 ../
  const clean = userPath.replace(/^\/+/, '').replace(/\.\./g, '');
  const resolved = path.resolve(sandbox, clean);
  if (!resolved.startsWith(sandbox)) return null;
  return resolved;
}

// ========== file_read ==========
export class FileReadTool implements Tool {
  readonly name = 'file_read';
  readonly description = '读取指定文件的内容（UTF-8 文本）。用户说"读一下XX文件"、"打开笔记"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径，相对于用户文件目录' },
    },
    required: ['path'],
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const safe = safePath(sandbox, args.path);
    if (!safe) return { success: false, error: 'INVALID_PATH' };

    const stat = await fs.stat(safe).catch(() => null);
    if (!stat) return { success: false, error: 'FILE_NOT_FOUND' };
    if (stat.isDirectory()) return { success: false, error: 'IS_DIRECTORY' };
    if (stat.size > 1024 * 1024) return { success: false, error: 'FILE_TOO_LARGE' };

    const content = await fs.readFile(safe, 'utf-8');
    return { content, size: stat.size, path: args.path };
  }
}

// ========== file_write ==========
export class FileWriteTool implements Tool {
  readonly name = 'file_write';
  readonly description = '写入或创建一个文本文件。用户说"写一篇日记"、"保存笔记"、"创建文件"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      content: { type: 'string', description: '文件内容（UTF-8 文本）' },
    },
    required: ['path', 'content'],
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const safe = safePath(sandbox, args.path);
    if (!safe) return { success: false, error: 'INVALID_PATH' };
    if (args.content.length > 1024 * 1024) return { success: false, error: 'CONTENT_TOO_LARGE' };

    await fs.mkdir(path.dirname(safe), { recursive: true });
    await fs.writeFile(safe, args.content, 'utf-8');
    return { success: true, path: args.path, size: args.content.length };
  }
}

// ========== file_list ==========
export class FileListTool implements Tool {
  readonly name = 'file_list';
  readonly description = '列出指定目录下的文件和子目录。用户问"我有哪些文件"、"目录里有什么"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      directory: { type: 'string', description: '目录路径，可选，默认根目录' },
    },
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const dir = args?.directory || '';
    const safe = safePath(sandbox, dir);
    if (!safe) return { success: false, error: 'INVALID_PATH' };

    const stat = await fs.stat(safe).catch(() => null);
    if (!stat) return { success: false, error: 'DIRECTORY_NOT_FOUND' };

    const entries = await fs.readdir(safe, { withFileTypes: true });
    const files = entries.map(e => {
      const item: any = { name: e.name, type: e.isDirectory() ? 'dir' : 'file' };
      if (e.isFile()) {
        const st = fs.stat(path.join(safe, e.name));
        item.size = (await st).size;
      }
      return item;
    });
    return { files, directory: dir };
  }
}

// ========== file_delete ==========
export class FileDeleteTool implements Tool {
  readonly name = 'file_delete';
  readonly description = '删除一个文件。用户说"删除XX文件"、"清理旧笔记"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: '要删除的文件路径' },
    },
    required: ['path'],
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const safe = safePath(sandbox, args.path);
    if (!safe) return { success: false, error: 'INVALID_PATH' };

    try {
      await fs.unlink(safe);
      return { success: true, path: args.path };
    } catch {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }
  }
}
```

### 4.3 send\_letter 工具

```typescript
// server/src/tools/builtins/send-letter.ts
import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { letterService } from '../../modules/letter/service.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';
import { addressBookRepo } from '../../db/repositories/address-book.repo.js';

export class SendLetterTool implements Tool {
  readonly name = 'send_letter';
  readonly description = '向另一个智能体发送信件。用户说"帮我给XX发封信"、"写封信给XX"时使用。目标智能体必须在通讯录中。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      target_agent_id: { type: 'string', description: '目标智能体 ID' },
      subject: { type: 'string', description: '信件主题（可选）' },
      body: { type: 'string', description: '信件正文内容' },
    },
    required: ['target_agent_id', 'body'],
  };

  async execute(args: any, ctx: ToolContext) {
    const targetId = args.target_agent_id;
    const body = args.body;

    // 验证目标智能体存在
    const target = agentRepo.getById(targetId);
    if (!target) {
      return { success: false, error: 'AGENT_NOT_FOUND' };
    }

    // 检查通讯录
    const inBook = addressBookRepo.hasContact(ctx.agentId, targetId);
    if (!inBook) {
      return { success: false, error: 'NOT_IN_ADDRESS_BOOK' };
    }

    // 发送
    const letterId = letterService.send({
      fromAgentId: ctx.agentId,
      toAgentId: targetId,
      subject: args.subject || body.slice(0, 30),
      body,
    });

    return { success: true, letter_id: letterId, to_name: target.name };
  }
}
```

***

## 5. LLM Function Calling 集成

### 5.1 llm.ts 改造

在现有 `buildPrompt` 和 `llmChat`/`llmStream` 基础上，新增：

```typescript
// server/src/utils/llm.ts（新增部分）

/** LLM 响应中可能出现 tool_call 的场景 */
export interface LlmResponse {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;  // JSON 字符串
    };
  }>;
}

/** 非流式，支持 tools */
export async function llmChatWithTools(
  messages: any[],
  tools?: LlmToolDefinition[]
): Promise<LlmResponse> {
  const url = `${config.llm.baseUrl}/chat/completions`;
  const body: any = {
    model: config.llm.model,
    messages,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'LLM API error');
    throw new Error(`LLM API failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const msg = json.choices[0].message;
  return {
    content: msg.content,
    tool_calls: msg.tool_calls,
  };
}
```

### 5.2 工具执行编排（核心循环）

```typescript
// server/src/modules/chat/tool-executor.ts
import { toolRegistry } from '../../tools/registry.js';
import { buildPrompt } from '../../utils/llm.js';
import type { Agent, ChatMessage, MemoryItem } from '@meta-world/shared';

const MAX_TOOL_ROUNDS = 5;

export interface ToolStep {
  toolName: string;
  args: unknown;
  result: unknown;
}

/**
 * 执行完整的 tool-use 循环
 * @returns { finalText, toolSteps[] }
 */
export async function runToolLoop(
  agent: Agent,
  history: ChatMessage[],
  memories: MemoryItem[],
  userMessage: string,
  ctx: { agentId: string; userId: string }
): Promise<{ finalText: string; toolSteps: ToolStep[] }> {
  const tools = toolRegistry.getLlmDefinitions();
  const toolSteps: ToolStep[] = [];

  // 构建初始 messages
  let messages = buildPrompt({ agent, history, memories, userMessage });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await llmChatWithTools(messages, tools);

    // 如果没有 tool_calls，直接返回
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return { finalText: response.content || '', toolSteps };
    }

    // 将 assistant 的 tool_calls 消息加入历史
    const assistantMsg: any = {
      role: 'assistant',
      content: response.content || null,
      tool_calls: response.tool_calls,
    };
    messages.push(assistantMsg);

    // 依次执行每个 tool_call
    for (const tc of response.tool_calls) {
      // 加入 tool 消息（按 OpenAI 协议格式）
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: '', // 先占位，后面追加结果
      });

      let args: unknown;
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        args = {};
      }

      const result = await toolRegistry.execute(
        tc.function.name,
        args,
        { agentId: ctx.agentId, userId: ctx.userId }
      );

      toolSteps.push({
        toolName: tc.function.name,
        args,
        result,
      });

      // 用结果替换 tool message 的 content
      messages[messages.length - 1].content = JSON.stringify(result);
    }
  }

  // 超过最大轮次，强制返回最后一条 assistant 内容
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  return {
    finalText: lastAssistant?.content || '抱歉，我在处理时遇到了循环限制，请换个方式问我。',
    toolSteps,
  };
}
```

### 5.3 Chat Route 改造

```typescript
// server/src/modules/chat/route.ts（改造要点）

app.post('/chat/stream', { preHandler: verifyAuth }, async (req, reply) => {
  const body = req.body as { agent_id: string; message: string };
  const user = getAuthUser(req);

  // ... 原有 agent 加载、记忆召回 ...

  // 使用 function calling 循环
  const { finalText, toolSteps } = await runToolLoop(
    agent, history, memories, body.message,
    { agentId: body.agent_id, userId: user.sub }
  );

  // 返回流式响应 + 工具步骤元数据
  // 前端先接收 toolSteps 元数据，再接收 finalText 流式内容
  reply.header('Content-Type', 'text/event-stream');
  reply.header('Cache-Control', 'no-cache');

  // 先发工具步骤（如果有）
  if (toolSteps.length > 0) {
    reply.write(`event: tools\ndata: ${JSON.stringify(toolSteps)}\n\n`);
  }

  // 再流式发送最终回答
  for await (const token of tokenizeStream(finalText)) {
    reply.write(`event: token\ndata: ${token}\n\n`);
  }
  reply.write('event: done\ndata: \n\n');
  reply.end();
});
```

***

## 6. 数据库变更

### 6.1 无新增表

v0.4.0 不新增数据库表。工具执行日志通过现有 logger 输出到文件。

### 6.2 文件存储目录

```
server/
├── data/
│   └── users/
│       ├── {userId-1}/
│       │   └── files/          ← 该用户的文件沙箱
│       └── {userId-2}/
│           └── files/
```

***

## 7. 前端设计

### 7.1 ToolCallCard 组件

```vue
<!-- web/src/components/ToolCallCard.vue -->
<template>
  <div class="tool-call-card">
    <div class="tool-header">
      <span class="tool-icon">{{ icon }}</span>
      <span class="tool-name">{{ toolName }}</span>
      <span v-if="success" class="status success">✓</span>
      <span v-else class="status error">✗</span>
    </div>
    <div class="tool-args">
      <span class="label">参数:</span> {{ formatArgs }}
    </div>
    <div class="tool-result" v-if="resultPreview">
      <span class="label">结果:</span> {{ resultPreview }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  toolName: string;
  args: unknown;
  result: unknown;
  success?: boolean;
}>();

const TOOL_ICONS: Record<string, string> = {
  get_time: '🕐',
  file_read: '📖',
  file_write: '📝',
  file_list: '📂',
  file_delete: '🗑️',
  send_letter: '✉️',
};

const icon = computed(() => TOOL_ICONS[props.toolName] || '🔧');
const success = computed(() => props.success !== false);

const formatArgs = computed(() => {
  try {
    return JSON.stringify(props.args);
  } catch {
    return String(props.args);
  }
});

const resultPreview = computed(() => {
  if (!props.result) return '';
  try {
    const str = typeof props.result === 'string' ? props.result : JSON.stringify(props.result);
    return str.length > 120 ? str.slice(0, 120) + '...' : str;
  } catch {
    return String(props.result);
  }
});
</script>

<style scoped>
.tool-call-card {
  background: #f8f9fa;
  border-left: 3px solid #409eff;
  padding: 10px 14px;
  margin: 8px 0;
  border-radius: 4px;
  font-size: 13px;
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-weight: 500;
}
.tool-icon { font-size: 16px; }
.tool-name { color: #333; }
.status.success { color: #67c23a; }
.status.error { color: #f56c6c; }
.label { color: #909399; margin-right: 4px; }
.tool-args, .tool-result {
  color: #606266;
  font-family: monospace;
  font-size: 12px;
  margin-top: 2px;
}
</style>
```

### 7.2 Chat.vue 改造要点

```vue
<!-- web/src/views/Chat.vue 改造片段 -->
<template>
  <div class="chat-page">
    <!-- 简化 Header：只保留智能体名称和极简操作 -->
    <div class="chat-header">
      <div class="agent-info">
        <h3>{{ agent?.name }}</h3>
      </div>
      <div class="header-actions">
        <el-button link @click="$router.push(`/memory/${agentId}`)">🧠</el-button>
        <el-button link @click="$router.push(`/mailbox/${agentId}`)">📬</el-button>
      </div>
    </div>

    <!-- 消息列表：去掉卡片边框 -->
    <div ref="scrollRef" class="message-list">
      <el-empty v-if="chat.messages.length === 0" description="和智能体聊点什么..." />
      <div v-for="(msg, i) in chat.messages" :key="i" class="message-row"
           :class="{ user: msg.role === 'user', assistant: msg.role === 'assistant' }">
        <!-- 工具调用卡片（内嵌在 assistant 消息中） -->
        <ToolCallCard v-for="(step, si) in (msg.toolSteps || [])" :key="si"
                      :tool-name="step.toolName" :args="step.args"
                      :result="step.result" :success="step.result?.success" />
        <div v-if="msg.content" class="bubble">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <el-input v-model="inputMsg" type="textarea" :rows="2"
                placeholder="和智能体聊点什么... (Ctrl+Enter 发送)"
                @keydown.enter.ctrl="send" :disabled="chat.isStreaming" />
      <el-button type="primary" :loading="chat.isStreaming" @click="send">发送</el-button>
    </div>
  </div>
</template>
```

### 7.3 各页面简洁化改造要点

| 页面              | 改造点                                           |
| --------------- | --------------------------------------------- |
| AgentList.vue   | 去掉 `el-tag` 标签堆叠、简化卡片样式、空状态改为一行文案             |
| CreateAgent.vue | label 改为 placeholder、去掉 `el-divider` 分组、表单更紧凑 |
| Mailbox.vue     | 去掉信件卡片的 `el-card` 包裹，改成纯列表行；处理日志时间线用浅色背景      |
| MemoryView\.vue | 置信度进度条改为百分比数字；筛选器改为更紧凑的 select                |
| App.vue         | 侧边栏图标化，去掉冗余的文字说明                              |

***

## 8. chatStore 扩展

```typescript
// web/src/stores/chat.ts（扩展）

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolSteps?: ToolStepView[];  // ← 新增
}

interface ToolStepView {
  toolName: string;
  args: unknown;
  result: unknown;
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    isStreaming: false,
    pendingToolSteps: [] as ToolStepView[],  // ← 新增
  }),
  actions: {
    // ... 原有 push/appendLastToken ...

    // 新增：追加工具步骤到当前 assistant 消息
    appendToolSteps(steps: ToolStepView[]) {
      if (this.messages.length === 0) return;
      const last = this.messages[this.messages.length - 1];
      if (last.role === 'assistant') {
        last.toolSteps = [...(last.toolSteps || []), ...steps];
      }
    },
  },
});
```

***

## 9. 风险与注意事项

| #  | 风险点                       | 应对方案                                                            |
| -- | ------------------------- | --------------------------------------------------------------- |
| R1 | LLM 不支持 function calling  | deepseek-v4-flash 已支持；如换用其他模型需验证                                |
| R2 | 工具死循环                     | MAX\_TOOL\_ROUNDS = 5，强制退出                                      |
| R3 | 文件路径穿越                    | safePath 函数双重检查，移除 `../` 后再 resolve，再验证 `startsWith(sandbox)`   |
| R4 | 工具结果过大导致 SSE 卡顿           | result 超过 4KB 时截断 + 提示用户                                        |
| R5 | 前端工具卡片与流式消息时序问题           | 后端先发 `event: tools`，再发 `event: token`；前端收到 tools 后先渲染卡片，再流式填充文本 |
| R6 | 旧版 client 不识别 tools event | 旧版会把工具步骤 JSON 当普通 token 显示，需前端识别 `event:` 类型字段                  |

