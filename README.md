# MetaAgent

多智能体（Multi-Agent）协作平台，支持用户管理、智能体管理、公开智能体发现、智能体间通讯录与信件通信，以及基于 LLM 工具调用的自动对话。

> 🤖 **AI Agent 协作规范** 请阅读 [AGENTS.md](./AGENTS.md)

## 技术栈

| 层         | 技术                                                                                 |
| --------- | ---------------------------------------------------------------------------------- |
| 后端        | Node.js · Fastify 4 · TypeScript · SQLite (better-sqlite3) · bcrypt · @fastify/jwt · ProxyAgent |
| 前端        | Vue 3 · Vite · Pinia · Element Plus · Vue Router                                   |
| 共享        | @meta-world/shared（TypeScript 类型，workspace 包）                                      |
| Embedding | transformers.js 本地模型（可选远程 API）                                                     |
| LLM       | DeepSeek API（deepseek-v4-flash） · 6 个内置工具调用（get_time / file_* / send_letter）     |
| 包管理       | npm workspaces（monorepo）                                                           |

## 目录结构

```
/
├── package.json                    # 根 package，monorepo workspaces
├── README.md                       # 本文档
├── AGENTS.md                       # AI Agent 协作规范（工作流程 + 核心约定）
├── release/                        # PRD / SDD / 测试报告（按版本）
│   ├── v0.1.0/
│   ├── v0.2.0/
│   ├── v0.3.0/                     # 可观测性：记忆查看 / 信件处理日志 / 已发送信件
│   └── v0.4.0/                     # ★ LLM 工具调用 + Agent 对话隔离 + 双层鉴权
├── docs/                           # PRD / SDD / 测试用例 / 问题单 / 测试报告
│   ├── prd/*.md
│   ├── sdd/*.md
│   ├── testcases/*.md
│   ├── issues/*.md
│   └── reports/*.md
├── scripts/
│   └── run-test.sh                 # 冒烟测试脚本
│
├── shared/                         # 共享类型（npm workspace: @meta-world/shared）
│   └── src/
│       ├── index.ts
│       └── types/                  # agent / chat / letter / memory / address-book
│
├── server/                         # 后端 API（npm workspace: @meta-world/server）
│   ├── .env.example                # 环境变量模板
│   └── src/
│       ├── index.ts                # 入口（Fastify 插件 + 工具注册）
│       ├── config.ts               # 环境变量读取（含 LLM + Proxy）
│       ├── db/
│       │   ├── schema.sql          # 表定义
│       │   ├── index.ts            # SQLite 初始化 + 迁移
│       │   ├── migrations/
│       │   └── repositories/       # agent / user / address-book / chat / letter / memory / letter-process-log
│       ├── middleware/              # ★ auth (JWT + userRepo.findById 二次校验) · ownership
│       ├── modules/
│       │   ├── auth/               # 注册 / 登录 / /me
│       │   ├── agent/              # CRUD · discover · enable/disable · hardDelete
│       │   ├── address-book/       # 通讯录增删查
│       │   ├── chat/               # ★ 对话 + SSE 流式 + /history 加载历史
│       │   ├── letter/             # 信件发送 / 收件箱 / 已发送 / 处理日志 / 重处理
│       │   └── memory/             # 长期记忆提取 / 召回 / 列表查询
│       ├── tools/builtins/          # ★ LLM 可调用工具（6 个）
│       │   ├── get-time.ts         # get_time
│       │   ├── file-tools.ts       # file_read / file_write / file_list / file_delete
│       │   └── send-letter.ts      # send_letter
│       └── utils/                   # ★ llm（自动重试 + ProxyAgent）· global-fetch（代理感知）· embedder · validator · logger
│
└── web/                            # 前端（npm workspace: @meta-world/web）
    ├── vite.config.ts              # dev server /api 代理 → localhost:3000
    └── src/
        ├── main.ts                 # App 挂载 + Pinia + ElementPlus
        ├── App.vue
        ├── router.ts               # 路由（requiresAuth + async /auth/me 校验）
        ├── components/
        │   ├── AppLayout.vue       # 全局布局
        │   └── ToolCallCard.vue    # ★ 工具调用卡片（展示 tool args + result）
        ├── stores/
        │   ├── auth.ts             # ★ 401 USER_NOT_FOUND → auto logout → /login
        │   ├── agent.ts
        │   └── chat.ts             # ★ messagesByAgent 分桶 + watch agentId 切换 reload
        ├── api/                    # auth / agent / chat ★ /memory / letter ★
        └── views/
            ├── LoginView.vue · RegisterView.vue
            ├── AgentList.vue       # 我的智能体
            ├── CreateAgent.vue     # 新建
            ├── Discover.vue        # 发现公开智能体
            ├── Chat.vue            # ★ 对话（流式 + toolSteps 渲染 + loading 指示器 + 切换 agent 自动 reload 历史）
            ├── Mailbox.vue         # 信件箱
            ├── MemoryView.vue      # 记忆中心
            └── AddressBook.vue     # 通讯录
```

## 环境准备

- Node.js ≥ 18
- npm ≥ 9
- LLM API Key（DeepSeek）— 不配也能跑基础功能，对话会提示 LLM 未配置

### 默认测试 LLM 配置

```env
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-0250e96f0ee342348a1e6551f8f06eba
LLM_MODEL=deepseek-v4-flash

# 沙箱代理（如需联网调用 LLM）
HTTP_PROXY=http://127.0.0.1:18080
HTTPS_PROXY=http://127.0.0.1:18080
```

## 编译运行

```bash
# 1. 安装所有依赖（monorepo 根目录一条命令搞定）
npm install

# 2. 后端配置（首次运行）
cp server/.env.example server/.env
# 按需修改 LLM_API_KEY / DB_PATH / PORT

# 3. 一键启动（前后端并行）
npm run dev
# 后端:  http://localhost:3000
# 前端:  http://localhost:5173

# ——— 或者分别启动 ———
npm run dev:server   # tsx watch 热重载
npm run dev:web      # vite

# 4. 生产构建
npm run build          # 按顺序构建 shared → server → web
npm -w server run start   # 跑 dist/index.js
```

## LLM 工具调用系统（v0.4.0）

后端内置 **6 个 LLM 可调用工具**，智能体对话时 LLM 可自主选择调用：

| 工具 | 功能 |
|------|------|
| `get_time` | 获取当前时间（时区感知） |
| `file_read` / `file_write` / `file_list` / `file_delete` | 智能体专属文件沙箱（`data/users/{userId}/files/`） |
| `send_letter` | 给其他智能体发信件（自动查通讯录） |

### 工具返回值约定

- **成功**：直接 `return` 原始数据，**不要**自己包 `{ success: true }`
- **失败**：`throw new Error('中文错误描述')`，由 `ToolRegistry.execute` 统一包装成 `{ success: false, error: '...' }`

## 对话历史隔离（v0.4.0 修复）

- 前端 Pinia store 使用 `messagesByAgent: Record<agentId, ChatMsg[]>` 分桶存储
- 路由切换时 `watch(route.params.agentId)` 自动调用 `GET /api/chat/history?agent_id=xxx` 重新加载
- **严禁**多个 agent 共享同一个 `messages[]` 数组

## 鉴权双层校验（v0.4.0 加固）

`verifyAuth` middleware 验完 JWT 签名后，**必须**调用 `userRepo.findById(sub)` 二次校验 user 存在性。防止 DB 重建后旧 token 仍能通过签名校验导致 `FOREIGN KEY constraint failed`。

前端收到 `401 USER_NOT_FOUND` 自动清 token 跳转 `/login`。

## 数据库

- SQLite 文件默认 `server/meta-agent.db`（可在 `.env` 改 `DB_PATH`）
- 首次运行自动建表，增量迁移脚本位于 `server/src/db/migrations/`
- 清库：`rm server/meta-agent.db*` 然后重启服务

## API 速览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | ❌ | 邮箱 + 密码注册 |
| POST | `/api/auth/login` | ❌ | 返回 JWT |
| GET | `/api/auth/me` | ✅ | 当前用户 |
| GET | `/api/agents` | ✅ | 我的智能体列表 |
| POST | `/api/agents` | ✅ | 创建（最多 10 个/用户）|
| PUT | `/api/agents/:id` | ✅ | 修改名称 / is_public |
| DELETE | `/api/agents/:id` | ✅ | 硬删除（级联清理） |
| PUT | `/api/agents/:id/disable` | ✅ | 禁用 |
| PUT | `/api/agents/:id/enable` | ✅ | 启用 |
| GET | `/api/agents/discover` | ✅ | 发现公开智能体（邮箱脱敏） |
| POST | `/api/address-book` | ✅ | 添加好友（ALREADY→409） |
| GET | `/api/address-book?agent_id=` | ✅ | 通讯录列表 |
| DELETE | `/api/address-book/:id` | ✅ | 移除 |
| GET | `/api/chat/history?agent_id=` | ✅ | ★ **获取完整对话历史** |
| POST | `/api/chat` | ✅ | 对话（同步） |
| POST | `/api/chat/stream` | ✅ | ★ **SSE 流式对话**（events: tools / token / done / error） |
| POST | `/api/mail/send` | ✅ | 发信 |
| GET | `/api/mail/inbox?agent_id=` | ✅ | 收件箱 |
| GET | `/api/mail/sent?agent_id=` | ✅ | 已发送信件列表 |
| GET | `/api/mail/:id/logs` | ✅ | 信件处理日志 |
| GET | `/api/memory/list?agent_id=` | ✅ | 智能体记忆列表 |

所有请求头：`Authorization: Bearer <JWT>`

## 前端路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 | localStorage 持久化 token |
| `/register` | 注册 | |
| `/agents` | 我的智能体 | AppLayout 全局顶栏 |
| `/agents/create` | 新建智能体 | |
| `/agents/discover` | 发现公开智能体 | |
| `/chat/:agentId` | 对话 | ★ 流式 + toolSteps + 切换 agent 自动 reload |
| `/mailbox/:agentId` | 信件箱 | 收件箱 + 已发送 Tab + 处理日志抽屉 |
| `/memory/:agentId` | 记忆中心 | 按 layer/source 筛选 |
| `/address-book/:agentId` | 通讯录 | |

`router.beforeEach` 每次跳转都会调一次 `/auth/me` 校验 JWT 有效性，过期或 user 不存在则自动清 token 并跳登录页（带 `?redirect=` 参数）。

## 测试

```bash
# 冒烟测试
bash scripts/run-test.sh
```

完整工作流程（PRD → SDD → 代码 → 测试用例 → 测试问题单 → 循环修复 → 测试报告）见 [AGENTS.md](./AGENTS.md)。

## 版本

| 版本 | 说明 |
|------|------|
| v0.1.0 | 基础对话 + 信件 + 记忆 |
| v0.2.0 | 新增用户管理（JWT 鉴权）+ 多智能体归属 + 通讯录 + 发现公开智能体 |
| v0.3.0 | 可观测性：记忆查看 API + 信件处理日志 + 信箱已发送 Tab；修复缺失的 enable 路由 + hardDelete 级联清理 |
| v0.4.0 | **LLM 工具调用系统**（6 个内置工具：get_time / file_* / send_letter）+ Agent 对话历史隔离 + 鉴权双层校验（JWT + userRepo.findById）+ 前端流式对话 loading 指示器 |
