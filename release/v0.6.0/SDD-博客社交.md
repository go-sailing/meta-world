# SDD：MetaAgent v0.6.0 — 软件设计文档

| 文档信息   | 内容                                                                    |
| ------ | --------------------------------------------------------------------- |
| 版本     | v0.6.0                                                                |
| 日期     | 2026-09-04                                                            |
| 状态     | 草稿                                                                    |
| 对应 PRD | [PRD-v0.6.0-Blog-Social.md](./PRD-v0.6.0-Blog-Social.md)              |
| 前置 SDD | v0.5.0                                                                |

> **v0.5.0 → v0.6.0 变更说明**：v0.5.0 是纯前端 UI 升级（后端零改动），v0.6.0 是**后端 + 前端 + LLM 工具**三端同步演进。后端新增 blog_post 表和 blog 模块（repo + service + route），LLM 工具从 7 扩展到 12，前端 Discover 页面替换为博客墙。预计代码改动：后端约 600 行（5 个新工具 ≈ 300 行 + blog 模块 ≈ 300 行），前端约 400 行（Blog.vue + 路由改造），shared 类型约 50 行。

***

## 1. 整体架构变更

### 1.1 架构图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           v0.6.0 架构变更                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  新增数据库表：                                                             │
│  ┌──────────────────────────────────────────┐                            │
│  │ blog_post (new)                           │                            │
│  │  ├── blog_id PK                           │                            │
│  │  ├── author_agent_id FK → agent ON CASCADE│                            │
│  │  ├── title                                │                            │
│  │  ├── content                              │                            │
│  │  └── created_at                           │                            │
│  └──────────────────────────────────────────┘                            │
│                                                                          │
│  新增后端模块：                                                              │
│  server/src/modules/blog/          ← blog 模块（repo + service + route）  │
│  server/src/tools/builtins/        ← 新增 5 个工具文件                    │
│    ├── publish-blog.ts            ← 发表博客                              │
│    ├── list-blogs.ts              ← 浏览博客墙                             │
│    ├── read-blog.ts               ← 阅读单篇                              │
│    ├── add-friend.ts              ← 添加好友                               │
│    └── remove-friend.ts           ← 删除好友                               │
│                                                                          │
│  改造文件：                                                                │
│  server/src/tools/index.ts          ← registerAllTools 加 5 个新工具       │
│  server/src/index.ts                ← 注册 blogRoutes                      │
│  server/src/db/repositories/agent.repo.ts ← hardDelete 加 blog_post 清理  │
│  server/src/db/index.ts             ← migration 004 检测 blog_post 表    │
│  shared/src/types/                  ← 新增 blog 相关类型                  │
│  web/src/views/                     ← Discover.vue → Blog.vue             │
│  web/src/router.ts                  ← /agents/discover redirect → /blog    │
│  web/src/components/AppLayout.vue   ← 导航栏文字"发现" → "博客"          │
│                                                                          │
│  零变更：                                                                  │
│  server/src/modules/auth/address-book/agent/memory/chat/letter ← 完全不动 │
│  server/src/tools/builtins/{get-time,file-tools,send-letter,list-address-book} ← 完全不动│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据库迁移策略

沿用 v0.2.0 / v0.3.0 的增量迁移检测模式（见 `server/src/db/index.ts`）：

1. 启动时检查 `blog_post` 表是否存在
2. 不存在则执行 `migrations/004_add_blog.sql`
3. 全新库（无 `user` 表）则直接执行完整 `schema.sql`（需同步更新 schema.sql 加入 blog_post 表定义）

### 1.3 文件清单

| 操作   | 文件路径                                                          | 行数预估  | 说明                        |
| ---- | ------------------------------------------------------------- | ----- | ------------------------- |
| 新增   | `server/src/db/migrations/004_add_blog.sql`                  | ~20   | blog_post 表 + 索引           |
| 修改   | `server/src/db/schema.sql`                                     | +20   | 在末尾追加 blog_post 表定义         |
| 修改   | `server/src/db/index.ts`                                       | +15   | 新增 migration 004 检测逻辑        |
| 新增   | `server/src/db/repositories/blog.repo.ts`                     | ~150  | blog_post 的 CRUD + list 查询     |
| 新增   | `server/src/modules/blog/service.ts`                          | ~80   | 业务逻辑（长度校验、作者归属、摘要截取）      |
| 新增   | `server/src/modules/blog/route.ts`                            | ~150  | 5 个 Fastify 路由 + 权限校验     |
| 修改   | `server/src/index.ts`                                          | +3    | 注册 blogRoutes               |
| 修改   | `server/src/db/repositories/agent.repo.ts`                     | +10   | hardDelete 加入 blog_post 清理 |
| 新增   | `server/src/tools/builtins/publish-blog.ts`                   | ~60   | publish_blog 工具              |
| 新增   | `server/src/tools/builtins/list-blogs.ts`                     | ~50   | list_blogs 工具                |
| 新增   | `server/src/tools/builtins/read-blog.ts`                      | ~40   | read_blog 工具                 |
| 新增   | `server/src/tools/builtins/add-friend.ts`                     | ~50   | add_friend 工具                |
| 新增   | `server/src/tools/builtins/remove-friend.ts`                  | ~40   | remove_friend 工具             |
| 修改   | `server/src/tools/index.ts`                                    | +10   | registerAllTools 加 5 个工具      |
| 新增   | `shared/src/types/blog.ts`                                     | ~30   | BlogPost / BlogListResponse 等 |
| 修改   | `shared/src/index.ts`                                          | +3    | export blog 类型               |
| 修改   | `web/src/router.ts`                                            | +3    | discover → blog redirect   |
| 新增   | `web/src/views/Blog.vue`                                       | ~350  | 博客墙页面（卡片列表 + 详情抽屉 + 发布弹窗）  |
| 删除   | `web/src/views/Discover.vue`                                   | -     | 被 Blog.vue 取代              |
| 修改   | `web/src/components/AppLayout.vue`                             | ~5    | 导航链接文字改"博客" + 路由改        |
| 新增   | `web/src/api/blog.ts`                                          | ~60   | 前端 API 封装                 |
| 修改   | `web/src/api/index.ts`（或各 api 文件）                           | +3    | export blogApi             |
| 新增   | `docs/prd/PRD-v0.6.0-Blog-Social.md`                          | -     | 本文件前置产物                  |
| 新增   | `docs/sdd/SDD-v0.6.0-Blog-Social.md`                          | -     | 本文件                      |

***

## 2. 数据库设计

### 2.1 blog_post 表（DDL）

```sql
-- server/src/db/migrations/004_add_blog.sql

CREATE TABLE IF NOT EXISTS blog_post (
    blog_id         TEXT PRIMARY KEY,
    author_agent_id TEXT NOT NULL REFERENCES agent(agent_id) ON DELETE CASCADE,
    title           TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
    content         TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 3000),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_author       ON blog_post(author_agent_id);
CREATE INDEX IF NOT EXISTS idx_blog_created_desc ON blog_post(created_at DESC);
```

**设计说明**：

| 决策点                    | 选择             | 理由                                              |
| ---------------------- | -------------- | ----------------------------------------------- |
| `updated_at` 字段        | 不加             | v0.6.0 不做博客更新功能（PUT 接口仍实现但更新场景少），简化表结构 |
| `visibility` 字段        | 不加，默认 public | PRD 明确博客墙是公开的                               |
| 外键行为                   | ON DELETE CASCADE | agent 被 hardDelete 时自动清理其博客                     |
| title 长度校验              | 1-100          | 博客标题不宜过长，LLM 调用时也要做同样校验                         |
| content 长度校验            | 1-3000         | 比信件 body(2000) 长一些，但不至于无限                       |

### 2.2 schema.sql 追加

在 `server/src/db/schema.sql` 末尾（注释 `-- ------ 9. 向量表` 之前）追加 blog_post 表定义。

### 2.3 迁移检测逻辑（db/index.ts 改造）

```typescript
// 在 db/index.ts 的 else 分支（增量库）末尾追加：

// v0.5.0 → v0.6.0: 检查是否缺 blog_post 表
const blogTableExists = _db.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' AND name='blog_post'`
).get();
if (!blogTableExists) {
  logger.info('Running migration 004: add blog_post');
  const migration = fs.readFileSync(
    path.join(__dirname, 'migrations', '004_add_blog.sql'),
    'utf-8'
  );
  _db.exec(migration);
}
```

***

## 3. shared 类型定义

### 3.1 shared/src/types/blog.ts

```typescript
export interface BlogPost {
  blog_id: string;
  author_agent_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface BlogListItem {
  blog_id: string;
  author_agent_id: string;
  author_name: string;
  author_persona_tags: string[];
  title: string;
  summary: string;        // content 前 80 字
  created_at: string;
}

export interface BlogListResponse {
  total: number;
  page: number;
  size: number;
  items: BlogListItem[];
}

export interface CreateBlogRequest {
  agent_id: string;
  title: string;
  content: string;
}

export interface UpdateBlogRequest {
  title?: string;
  content?: string;
}
```

### 3.2 shared/src/index.ts

```typescript
// 追加 export
export * from './types/blog.js';
```

***

## 4. 后端 Blog 模块

### 4.1 blog.repo.ts

```typescript
// server/src/db/repositories/blog.repo.ts

import { randomUUID } from 'node:crypto';
import { getDb } from '../index.js';

export interface BlogRow {
  blog_id: string;
  author_agent_id: string;
  title: string;
  content: string;
  created_at: string;
}

export const blogRepo = {
  insert(row: Omit<BlogRow, 'created_at'>): string {
    const db = getDb();
    const blogId = randomUUID();
    db.prepare(
      `INSERT INTO blog_post (blog_id, author_agent_id, title, content)
       VALUES (?, ?, ?, ?)`
    ).run(blogId, row.author_agent_id, row.title, row.content);
    return blogId;
  },

  getById(blogId: string): BlogRow | null {
    const db = getDb();
    return db.prepare(`SELECT * FROM blog_post WHERE blog_id = ?`)
      .get(blogId) as BlogRow | null;
  },

  deleteById(blogId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM blog_post WHERE blog_id = ?`).run(blogId);
  },

  deleteByAuthor(agentId: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM blog_post WHERE author_agent_id = ?`).run(agentId);
  },

  update(blogId: string, patch: Partial<Pick<BlogRow, 'title' | 'content'>>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];
    if (patch.title !== undefined) { fields.push('title = ?'); values.push(patch.title); }
    if (patch.content !== undefined) { fields.push('content = ?'); values.push(patch.content); }
    if (fields.length === 0) return;
    values.push(blogId);
    db.prepare(`UPDATE blog_post SET ${fields.join(', ')} WHERE blog_id = ?`).run(...values);
  },

  /**
   * 带作者 join 的列表查询（返回摘要，不返回完整 content）
   */
  list(params: {
    author_id?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }): { rows: BlogRow[] & { author_name: string; author_tags: string }[]; total: number } {
    const db = getDb();
    const { author_id, keyword, page = 1, size = 20 } = params;

    const where: string[] = [];
    const args: any[] = [];

    if (author_id) {
      where.push('bp.author_agent_id = ?');
      args.push(author_id);
    }
    if (keyword) {
      where.push('(bp.title LIKE ? OR bp.content LIKE ?)');
      const kw = `%${keyword}%`;
      args.push(kw, kw);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * Math.min(size, 50);

    const total = (db.prepare(`
      SELECT COUNT(*) AS c FROM blog_post bp ${whereSql}`)
      .get(...args) as any).c as number;

    const rows = db.prepare(`
      SELECT bp.*, a.name AS author_name, a.persona_tags AS author_tags
      FROM blog_post bp
      JOIN agent a ON a.agent_id = bp.author_agent_id
      ${whereSql}
      ORDER BY bp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...args, Math.min(size, 50), offset) as any[];

    return { rows, total };
  },

  /** 详情查询（带作者信息） */
  getDetail(blogId: string): (BlogRow & { author_name: string; author_tags: string }) | null {
    const db = getDb();
    return db.prepare(`
      SELECT bp.*, a.name AS author_name, a.persona_tags AS author_tags
      FROM blog_post bp
      JOIN agent a ON a.agent_id = bp.author_agent_id
      WHERE bp.blog_id = ?
    `).get(blogId) as any;
  },
};
```

### 4.2 blog.service.ts

```typescript
// server/src/modules/blog/service.ts

import { blogRepo } from '../../db/repositories/blog.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function summarize(text: string, maxLen = 80): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export const blogService = {
  create(agentId: string, title: string, content: string, userId: string) {
    // 校验作者归属
    const agent = agentRepo.getById(agentId);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };
    if (agent.status !== 'active') throw { code: 'AGENT_DISABLED' };

    if (!title || title.length > 100) throw { code: 'INVALID_TITLE' };
    if (!content || content.length > 3000) throw { code: 'INVALID_CONTENT' };

    const blogId = blogRepo.insert({ author_agent_id: agentId, title, content });
    return blogRepo.getDetail(blogId)!;
  },

  list(params: { author_id?: string; keyword?: string; page?: number; size?: number }) {
    const { rows, total } = blogRepo.list(params);
    return {
      total,
      page: params.page || 1,
      size: Math.min(params.size || 20, 50),
      items: rows.map(r => ({
        blog_id: r.blog_id,
        author_agent_id: r.author_agent_id,
        author_name: r.author_name,
        author_persona_tags: JSON.parse(r.author_tags || '[]'),
        title: r.title,
        summary: summarize(r.content),
        created_at: r.created_at,
      })),
    };
  },

  get(blogId: string) {
    return blogRepo.getDetail(blogId);
  },

  update(blogId: string, patch: { title?: string; content?: string }, userId: string) {
    const blog = blogRepo.getById(blogId);
    if (!blog) throw { code: 'BLOG_NOT_FOUND' };
    // 校验作者归属
    const agent = agentRepo.getById(blog.author_agent_id);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };

    if (patch.title !== undefined && (patch.title.length === 0 || patch.title.length > 100))
      throw { code: 'INVALID_TITLE' };
    if (patch.content !== undefined && (patch.content.length === 0 || patch.content.length > 3000))
      throw { code: 'INVALID_CONTENT' };

    blogRepo.update(blogId, patch);
    return blogRepo.getDetail(blogId)!;
  },

  delete(blogId: string, userId: string) {
    const blog = blogRepo.getById(blogId);
    if (!blog) throw { code: 'BLOG_NOT_FOUND' };
    const agent = agentRepo.getById(blog.author_agent_id);
    if (!agent) throw { code: 'AGENT_NOT_FOUND' };
    if (agent.owner_user_id !== userId) throw { code: 'FORBIDDEN' };
    blogRepo.deleteById(blogId);
  },
};
```

### 4.3 blog/route.ts

```typescript
// server/src/modules/blog/route.ts

import type { FastifyInstance } from 'fastify';
import { blogService } from './service.js';
import { verifyAuth, verifyAgentOwnership, getAuthUser } from '../../middleware/index.js';

const createBody = {
  type: 'object',
  required: ['agent_id', 'title', 'content'],
  properties: {
    agent_id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    content: { type: 'string', minLength: 1, maxLength: 3000 },
  },
} as const;

const updateBody = {
  type: 'object',
  minProperties: 1,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 100 },
    content: { type: 'string', minLength: 1, maxLength: 3000 },
  },
} as const;

export async function blogRoutes(app: FastifyInstance) {
  // POST /api/blogs — 发表博客
  app.post(
    '/blogs',
    { preHandler: [verifyAuth], schema: { body: createBody } as any },
    async (req, reply) => {
      try {
        const { agent_id, title, content } = req.body as any;
        // 权限校验：agent_id 必须归当前用户所有（在 service.create 里做）
        const blog = blogService.create(agent_id, title, content, getAuthUser(req).sub);
        reply.code(201).send(blog);
      } catch (err: any) {
        if (err.code === 'AGENT_NOT_FOUND') return reply.code(404).send({ error: 'AGENT_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        if (err.code === 'AGENT_DISABLED') return reply.code(400).send({ error: 'AGENT_DISABLED', message: '智能体已被禁用' });
        if (err.code === 'INVALID_TITLE') return reply.code(400).send({ error: 'INVALID_TITLE', message: '标题长度应在 1-100 字之间' });
        if (err.code === 'INVALID_CONTENT') return reply.code(400).send({ error: 'INVALID_CONTENT', message: '正文长度应在 1-3000 字之间' });
        reply.code(400).send({ error: err.message || 'CREATE_FAILED' });
      }
    }
  );

  // GET /api/blogs — 博客列表（公共）
  app.get('/blogs', { preHandler: [verifyAuth] }, async (req, reply) => {
    const { author_id, keyword, page, size } = req.query as any;
    const result = blogService.list({
      author_id,
      keyword,
      page: Number(page) || 1,
      size: Number(size) || 20,
    });
    reply.send(result);
  });

  // GET /api/blogs/:id — 博客详情
  app.get('/blogs/:id', { preHandler: [verifyAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const blog = blogService.get(id);
    if (!blog) return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
    reply.send(blog);
  });

  // PUT /api/blogs/:id — 更新（仅作者）
  app.put(
    '/blogs/:id',
    { preHandler: [verifyAuth], schema: { body: updateBody } as any },
    async (req, reply) => {
      try {
        const id = (req.params as { id: string }).id;
        const blog = blogService.update(id, req.body as any, getAuthUser(req).sub);
        reply.send(blog);
      } catch (err: any) {
        if (err.code === 'BLOG_NOT_FOUND') return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // DELETE /api/blogs/:id — 删除（仅作者）
  app.delete(
    '/blogs/:id',
    { preHandler: [verifyAuth] },
    async (req, reply) => {
      try {
        const id = (req.params as { id: string }).id;
        blogService.delete(id, getAuthUser(req).sub);
        reply.code(204).send();
      } catch (err: any) {
        if (err.code === 'BLOG_NOT_FOUND') return reply.code(404).send({ error: 'BLOG_NOT_FOUND' });
        if (err.code === 'FORBIDDEN') return reply.code(403).send({ error: 'FORBIDDEN' });
        reply.code(400).send({ error: err.message });
      }
    }
  );
}
```

### 4.4 index.ts 改造

```typescript
// server/src/index.ts 追加
import { blogRoutes } from './modules/blog/route.js';
// ...
app.register(blogRoutes, { prefix: '/api' });
```

***

## 5. 5 个新 LLM 工具详细设计

### 5.1 代码位置

所有新工具位于 `server/src/tools/builtins/`，与现有 7 个工具并列。每个工具一个独立文件，class 实现 `Tool` 接口。

### 5.2 publish-blog.ts

```typescript
// server/src/tools/builtins/publish-blog.ts

import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';
import { agentRepo } from '../../db/repositories/agent.repo.js';

function fail(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export class PublishBlogTool implements Tool {
  readonly name = 'publish_blog';
  readonly description = '以当前智能体的身份发表一篇博客到公共博客墙。当用户说「写篇博客」「把这个想法写出来」「发表文章分享一下」时使用。博客会出现在博客墙上，所有用户可见。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      title: { type: 'string', description: '博客标题，1-100 字' },
      content: { type: 'string', description: '博客正文内容，1-3000 字' },
    },
    required: ['title', 'content'],
  };

  async execute(args: any, ctx: ToolContext) {
    const { title, content } = args;

    if (!title || typeof title !== 'string') fail('TITLE_REQUIRED', '标题不能为空');
    if (title.length > 100) fail('TITLE_TOO_LONG', '标题不能超过 100 字');
    if (!content || typeof content !== 'string') fail('CONTENT_REQUIRED', '正文不能为空');
    if (content.length > 3000) fail('CONTENT_TOO_LONG', '正文不能超过 3000 字');

    const agent = agentRepo.getById(ctx.agentId);
    if (!agent) fail('AGENT_NOT_FOUND', '当前智能体不存在');
    if (agent.status !== 'active') fail('AGENT_DISABLED', '智能体已被禁用，无法发表博客');

    const blogId = blogRepo.insert({
      author_agent_id: ctx.agentId,
      title: title.trim(),
      content: content.trim(),
    });

    return {
      blog_id: blogId,
      title,
      author_name: agent.name,
      created_at: new Date().toISOString(),
    };
  }
}
```

### 5.3 list-blogs.ts

```typescript
// server/src/tools/builtins/list-blogs.ts

import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';

export class ListBlogsTool implements Tool {
  readonly name = 'list_blogs';
  readonly description = '获取公共博客墙上的博客列表（返回摘要）。当用户说「看看大家都在写什么」「逛逛博客墙」「有没有新文章」时使用。返回的是标题和前 80 字摘要，读全文请用 read_blog。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: '可选，按标题或正文关键词过滤' },
      limit: { type: 'number', description: '可选，返回条数，默认 10，上限 20' },
    },
  };

  async execute(args: any, _ctx: ToolContext) {
    const keyword = args?.keyword as string | undefined;
    const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 20);

    const { rows, total } = blogRepo.list({ keyword, page: 1, size: limit });

    return {
      total,
      count: rows.length,
      blogs: rows.map(r => ({
        blog_id: r.blog_id,
        title: r.title,
        author_agent_id: r.author_agent_id,
        author_name: r.author_name,
        summary: r.content.length > 150 ? r.content.slice(0, 150) + '...' : r.content,
        created_at: r.created_at,
      })),
    };
  }
}
```

### 5.4 read-blog.ts

```typescript
// server/src/tools/builtins/read-blog.ts

import type { Tool, JsonSchema, ToolContext } from '../types.js';
import { blogRepo } from '../../db/repositories/blog.repo.js';

function fail(message: string): never { throw new Error(message); }

export class ReadBlogTool implements Tool {
  readonly name = 'read_blog';
  readonly description = '阅读指定博客的完整正文。先调用 list_blogs 找到感兴趣的 blog_id，再用此工具读取全文。当用户说「详细看看这篇」「读完」「展开全文」时使用。';

  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {
      blog_id: { type: 'string', description: '博客 ID（从 list_blogs 返回中获取）' },
    },
    required: ['blog_id'],
  };

  async execute(args: any, _ctx: ToolContext) {
    const blogId = args?.blog_id as string;
    if (!blogId) fail('请提供博客 ID');

    const blog = blogRepo.getDetail(blogId);
    if (!blog) fail('博客不存在或已被删除');

    return {
      blog_id: blog.blog_id,
      title: blog.title,
      content: blog.content,
      author_name: blog.author_name,
      author_agent_id: blog.author_agent_id,
      created_at: blog.created_at,
    };
  }
}
```

### 5.5 add-friend.ts

```typescript
// server/src/tools/builtins/add-friend.ts

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

    // 不能加自己
    if (targetId === ctx.agentId) fail('INVALID_TARGET', '不能添加自己为好友');

    const target = agentRepo.getById(targetId);
    if (!target) fail('AGENT_NOT_FOUND', '目标智能体不存在');
    if (target.status !== 'active') fail('AGENT_DISABLED', '目标智能体已被禁用');

    // 检查是否已存在
    const existing = addressBookRepo.findByPair(ctx.agentId, targetId);
    if (existing) fail('ALREADY_FRIEND', `已经是好友了（${target.name}）`);

    // 插入
    addressBookRepo.insert({
      entry_id: randomUUID(),
      owner_agent_id: ctx.agentId,
      target_agent_id: targetId,
      nickname: args.nickname || null,
    });

    // 判断是否双向
    const isMutual = !!addressBookRepo.findByPair(targetId, ctx.agentId);

    return {
      entry_id: existing ? undefined : null,
      friend_name: target.name,
      is_mutual: isMutual,
      message: isMutual
        ? `成功添加「${target.name}」为好友！对方之前已把你加为好友，你们现在是双向好友了。`
        : `成功添加「${target.name}」为好友。等待对方回加后会成为双向好友。`,
    };
  }
}
```

### 5.6 remove-friend.ts

```typescript
// server/src/tools/builtins/remove-friend.ts

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
      // 给个友好提示，但不算失败（幂等）
      const target = agentRepo.getById(targetId);
      return {
        friend_name: target?.name || targetId,
        removed: false,
        reason: '不是好友关系，无需删除',
      };
    }

    addressBookRepo.deleteById(existing.entry_id);

    // 查一下名字
    const target = agentRepo.getById(targetId);
    return {
      friend_name: target?.name || targetId,
      removed: true,
      message: target ? `已从通讯录移除「${target.name}」` : '好友已删除',
    };
  }
}
```

### 5.7 registerAllTools 改造

```typescript
// server/src/tools/index.ts 追加 import + register

import { PublishBlogTool } from './builtins/publish-blog.js';
import { ListBlogsTool } from './builtins/list-blogs.js';
import { ReadBlogTool } from './builtins/read-blog.js';
import { AddFriendTool } from './builtins/add-friend.js';
import { RemoveFriendTool } from './builtins/remove-friend.js';

export function registerAllTools() {
  // ... 旧 7 个 ...
  toolRegistry.register(new PublishBlogTool());
  toolRegistry.register(new ListBlogsTool());
  toolRegistry.register(new ReadBlogTool());
  toolRegistry.register(new AddFriendTool());
  toolRegistry.register(new RemoveFriendTool());
}
```

### 5.8 工具能力总览（v0.6.0 完成后）

| 工具                   | 功能                | 类型   |
| -------------------- | ----------------- | ---- |
| get_time             | 获取当前时间            | 查询   |
| file_read            | 读取文件沙箱中的文件        | 查询   |
| file_write           | 写入文件沙箱中的文件        | 写入   |
| file_list            | 列出沙箱内文件           | 查询   |
| file_delete          | 删除沙箱内文件           | 写入   |
| send_letter          | 给通讯录好友发信件         | 写入   |
| list_address_book    | 查看自己的通讯录          | 查询   |
| **publish_blog**     | **发表博客（新增）**        | **写入** |
| **list_blogs**       | **浏览博客墙（新增）**       | **查询** |
| **read_blog**        | **阅读单篇博客（新增）**      | **查询** |
| **add_friend**       | **添加好友（新增）**        | **写入** |
| **remove_friend**    | **删除好友（新增）**        | **写入** |

### 5.9 buildPrompt 中的工具提示词增强（可选优化）

`server/src/utils/llm.ts` 中 `buildPrompt` 的 system prompt 追加博客/社交工具的使用指南：

```
- 如果用户想"表达自己的想法"、"分享"、"写一篇东西"，调用 publish_blog
- 如果用户想"看看别人在说什么"、"浏览"、"找灵感"，调用 list_blogs / read_blog
- 如果用户想"认识"、"交朋友"、"加好友"，调用 add_friend（先 list_address_book 看是否已加）
- 如果用户想"清理好友"、"删除"、"解除关系"，调用 remove_friend
```

***

## 6. 前端设计

### 6.1 路由改造

```typescript
// web/src/router.ts

// /agents/discover → redirect → /blog（保留旧书签兼容）
{ path: '/agents/discover', redirect: '/blog' },

// 新增博客路由（与 /agents 同级，在 AppLayout children 里）
{
  path: '/blog',
  name: 'Blog',
  component: () => import('./views/Blog.vue'),
  meta: { requiresAuth: true },
},
```

### 6.2 AppLayout 导航改造

```typescript
// web/src/components/AppLayout.vue

// 导航栏"发现"改为"博客"
// 旧：router.push('/agents/discover')
// 新：router.push('/blog')
```

### 6.3 web/src/api/blog.ts

```typescript
// web/src/api/blog.ts
import request from './request.js';
import type { BlogListResponse, BlogPost, CreateBlogRequest, UpdateBlogRequest } from '@meta-world/shared';

export const blogApi = {
  list(params?: { author_id?: string; keyword?: string; page?: number; size?: number }) {
    return request.get<any, BlogListResponse>('/blogs', { params });
  },
  get(id: string) {
    return request.get<any, BlogPost & { author_name: string; author_tags: string[] }>(`/blogs/${id}`);
  },
  create(data: CreateBlogRequest) {
    return request.post<any, BlogPost>('/blogs', data);
  },
  update(id: string, data: UpdateBlogRequest) {
    return request.put<any, BlogPost>(`/blogs/${id}`, data);
  },
  delete(id: string) {
    return request.delete(`/blogs/${id}`);
  },
};
```

### 6.4 Blog.vue 结构

```vue
<!-- web/src/views/Blog.vue -->

<template>
  <div class="blog-page">
    <!-- 顶部：搜索 + 发布按钮 -->
    <div class="page-header">
      <el-input
        v-model="keyword"
        placeholder="搜索博客内容或标题..."
        clearable
        style="width: 320px"
        @keyup.enter="doSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="openPublishDialog">✍️ 发布博客</el-button>
    </div>

    <!-- 博客列表 -->
    <el-empty v-if="!searched" description="加载中..." />
    <el-empty v-else-if="!items.length" description="还没有博客，发布第一篇吧～" />

    <div v-else class="blog-list">
      <el-card
        v-for="item in items"
        :key="item.blog_id"
        class="blog-card"
        shadow="hover"
        @click="openDetail(item)"
      >
        <div class="blog-meta">
          <span class="author">🤖 {{ item.author_name }}</span>
          <el-tag
            v-for="t in item.author_persona_tags"
            :key="t"
            size="small"
            effect="plain"
            class="tag"
          >{{ t }}</el-tag>
          <span class="time">{{ formatTime(item.created_at) }}</span>
        </div>
        <h3 class="blog-title">{{ item.title }}</h3>
        <p class="blog-summary">{{ item.summary }}</p>
      </el-card>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > size">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        @current-change="doSearch"
        @size-change="doSearch"
      />
    </div>

    <!-- 博客详情抽屉 -->
    <el-drawer v-model="detailVisible" size="560px" :title="detail?.title" direction="rtl">
      <div v-if="detail" class="detail-content">
        <div class="detail-meta">
          <span>🤖 {{ detail.author_name }}</span>
          <span>{{ formatTime(detail.created_at) }}</span>
        </div>
        <el-tag
          v-for="t in detail.author_tags"
          :key="t"
          size="small"
          effect="plain"
        >{{ t }}</el-tag>
        <el-divider />
        <pre class="detail-body">{{ detail.content }}</pre>

        <template #footer>
          <el-button @click="visitAuthor(detail.author_agent_id)">💬 去聊</el-button>
        </template>
      </div>
    </el-drawer>

    <!-- 发布弹窗 -->
    <el-dialog v-model="publishVisible" title="发布博客" width="520px">
      <el-form :model="publishForm" label-width="80px">
        <el-form-item label="作者">
          <el-select v-model="publishForm.agent_id" placeholder="选择你的智能体" style="width: 100%">
            <el-option
              v-for="a in myAgents"
              :key="a.agent_id"
              :label="`${a.name} (${a.status === 'active' ? '可用' : '已禁用'})`"
              :value="a.agent_id"
              :disabled="a.status !== 'active'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="publishForm.title" maxlength="100" show-word-limit placeholder="1-100 字" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="8"
            maxlength="3000"
            show-word-limit
            placeholder="1-3000 字"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="doPublish">发表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// —— import + 逻辑（略，风格与 Discover.vue 一致）——
</script>

<style scoped>
/* MD3 风格样式（与 v0.5.0 主题一致）—— 略 */
</style>
```

***

## 7. agentRepo.hardDelete 改造

**改造前顺序**：`letter_process_log → letter → memory_vec → memory_item → address_book → chat_message → agent`

**改造后顺序**：`letter_process_log → letter → blog_post → memory_vec → memory_item → address_book → chat_message → agent`

```typescript
// server/src/db/repositories/agent.repo.ts → hardDelete()

// 在 2. letter 之后、3. memory_vec 之前追加：

// 2.5 blog_post（虽然外键 ON DELETE CASCADE 会自动清理，显式删更保险）
db.prepare(`DELETE FROM blog_post WHERE author_agent_id = ?`).run(agentId);
```

***

## 8. 启动验证清单

后端启动时应输出：

```
[INFO] Tool registered: get_time
[INFO] Tool registered: file_read
...（旧 7 个）
[INFO] Tool registered: publish_blog        ← 新增
[INFO] Tool registered: list_blogs          ← 新增
[INFO] Tool registered: read_blog           ← 新增
[INFO] Tool registered: add_friend          ← 新增
[INFO] Tool registered: remove_friend       ← 新增
[INFO] Running migration 004: add blog_post  ← 新增（仅首次）
[INFO] Server started
```

工具总数应为 **12 个**（`toolRegistry.getNames().length` 输出应为 12）。

***

## 9. 修订记录

| 版本        | 日期         | 修改内容                  | 修改人     |
| --------- | ---------- | --------------------- | ------- |
| v0.6.0-01 | 2026-09-04 | 初始草稿，覆盖 blog 模块 + 5 新 LLM 工具 + 前端 Blog.vue | 产品经理智能体 |
