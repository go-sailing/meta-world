// server/src/tools/builtins/file-tools.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Tool, JsonSchema, ToolContext } from '../types.js';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/** 获取用户沙箱目录，自动创建 */
function getUserSandbox(userId: string): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sandbox = path.resolve(__dirname, '../../../../data/users', userId, 'files');
  fs.mkdir(sandbox, { recursive: true });
  return sandbox;
}

/** 安全路径解析（防止路径穿越） */
function safePath(sandbox: string, userPath: string): string | null {
  // 移除开头的 / 和 ../ 段
  const clean = userPath.replace(/^\/+/, '').replace(/\.\./g, '').replace(/\\/g, '/');
  const resolved = path.resolve(sandbox, clean);
  if (!resolved.startsWith(sandbox)) return null;
  return resolved;
}

// ========== file_read ==========
export class FileReadTool implements Tool {
  readonly name = 'file_read';
  readonly description = '读取指定文件的内容（UTF-8 文本）。用户说"读一下XX文件"、"打开笔记"、"看看文件内容"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径，相对于用户文件目录，如 "notes/diary.txt"' },
    },
    required: ['path'],
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const userPath = args.path || '';
    const safe = safePath(sandbox, userPath);
    if (!safe) return { success: false, error: 'INVALID_PATH' };

    const stat = await fs.stat(safe).catch(() => null);
    if (!stat) return { success: false, error: 'FILE_NOT_FOUND' };
    if (stat.isDirectory()) return { success: false, error: 'IS_DIRECTORY' };
    if (stat.size > MAX_FILE_SIZE) return { success: false, error: 'FILE_TOO_LARGE' };

    const content = await fs.readFile(safe, 'utf-8');
    return { content, size: stat.size, path: userPath };
  }
}

// ========== file_write ==========
export class FileWriteTool implements Tool {
  readonly name = 'file_write';
  readonly description = '写入或创建一个文本文件。用户说"写一篇日记"、"保存笔记"、"创建文件"、"帮我写个文件"时使用。';

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
    const userPath = args.path || '';
    const safe = safePath(sandbox, userPath);
    if (!safe) return { success: false, error: 'INVALID_PATH' };
    if ((args.content || '').length > MAX_FILE_SIZE) return { success: false, error: 'CONTENT_TOO_LARGE' };

    await fs.mkdir(path.dirname(safe), { recursive: true });
    await fs.writeFile(safe, args.content, 'utf-8');
    return { success: true, path: userPath, size: (args.content || '').length };
  }
}

// ========== file_list ==========
export class FileListTool implements Tool {
  readonly name = 'file_list';
  readonly description = '列出指定目录下的文件和子目录。用户问"我有哪些文件"、"目录里有什么"、"列出文件"时使用。';

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
    const files = await Promise.all(entries.map(async e => {
      const item: any = { name: e.name, type: e.isDirectory() ? 'dir' : 'file' };
      if (e.isFile()) {
        try {
          const st = await fs.stat(path.join(safe, e.name));
          item.size = st.size;
        } catch {
          item.size = 0;
        }
      }
      return item;
    }));
    return { files, directory: dir };
  }
}

// ========== file_delete ==========
export class FileDeleteTool implements Tool {
  readonly name = 'file_delete';
  readonly description = '删除一个文件。用户说"删除XX文件"、"清理旧笔记"、"删掉这个文件"时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: '要删除的文件路径' },
    },
    required: ['path'],
  };

  async execute(args: any, ctx: ToolContext) {
    const sandbox = getUserSandbox(ctx.userId);
    const userPath = args.path || '';
    const safe = safePath(sandbox, userPath);
    if (!safe) return { success: false, error: 'INVALID_PATH' };

    try {
      await fs.unlink(safe);
      return { success: true, path: userPath };
    } catch {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }
  }
}
