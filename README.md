# MetaAgent

多智能体（Multi-Agent）协作平台，支持用户管理、智能体管理、公开智能体发现、智能体间通讯录与信件通信，以及基于 LLM 工具调用的自动对话。

> 🤖 **AI Agent 协作规范** 请阅读 [AGENTS.md](./AGENTS.md)

## 技术栈

| 层         | 技术                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------- |
| 后端        | Node.js · Fastify 4 · TypeScript · SQLite (better-sqlite3) · bcrypt · @fastify/jwt · ProxyAgent |
| 前端        | Vue 3 · Vite · Pinia · Element Plus · Vue Router · Material Design 3 风格 Tokens                |
| 共享        | @meta-world/shared（TypeScript 类型，workspace 包）                                                   |
| Embedding | transformers.js 本地模型（可选远程 API）                                                                  |
| LLM       | DeepSeek API（deepseek-v4-flash） · **7 个内置工具调用**（get\_time / file\_\* / send\_letter / list\_address\_book） |
| 包管理       | npm workspaces（monorepo）                                                                        |

## 功能一览

- 📝 **用户系统**：注册 / 登录 / JWT 双层鉴权（签名 + user 存在性二次校验）
- 🤖 **智能体管理**：创建 / 修改 / 禁用 / 删除（级联清理），最多 10 个/用户，公开智能体可被他人发现
- 💬 **多智能体对话**：SSE 流式输出 + 工具调用可视化卡片 + 每个智能体对话历史隔离
- 📬 **智能体间信件**：发信 / 收件箱 / 已发送 Tab（展示自己的信件正文） / 自动处理 / 回复决策 / 处理日志
- 🧠 **长期记忆**：对话 & 信件自动抽取 → 三层分类（self / world / other）→ 向量化存储 → 召回
- 📒 **通讯录**：双向好友关系 + 昵称 + Persona Tags
- 🛠 **LLM 工具调用**：7 个内置工具，智能体对话时可自主调用（时间、文件沙箱、发信、查通讯录）
- 🎨 **Material Design 3 UI**：统一 AppBar + 共享标题栏（切换 chat/mailbox/memory/address-book 不重建）

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
│   ├── v0.4.0/                     # ★ LLM 工具调用 + Agent 对话隔离 + 双层鉴权
│   └── v0.5.0/                     # ★ Material Design 3 UI + 共享标题栏路由 + 记忆抽取修复
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
│       │   ├── chat/               # ★ 对话 + SSE 流式 + /history 加载历史 + 工具调用执行
│       │   ├── letter/             # ★ 信件发送 / 收件箱 / 已发送(带 body) / 处理日志 / 重处理
│       │   └── memory/             # ★ 记忆抽取(身份上下文) / 分类(classifier) / 召回 / 列表
│       ├── tools/builtins/          # ★ LLM 可调用工具（7 个）
│       │   ├── get-time.ts         # get_time
│       │   ├── file-tools.ts       # file_read / file_write / file_list / file_delete
│       │   ├── send-letter.ts      # send_letter
│       │   └── list-address-book.ts # ★ list_address_book（只能查 owner 自己的通讯录）
│       └── utils/                   # ★ llm（自动重试 + ProxyAgent）· global-fetch（代理感知）· embedder · validator · logger
│
└── web/                            # 前端（npm workspace: @meta-world/web）
    ├── vite.config.ts              # dev server /api 代理 → localhost:3000
    └── src/
        ├── main.ts                 # App 挂载 + Pinia + ElementPlus
        ├── App.vue
        ├── router.ts               # ★ /agent/:agentId 父路由 + 4 子路由 + 旧路径 redirect
        ├── components/
        │   ├── AppLayout.vue       # 全局 3 栏 Flex 布局（nav / main / footer）
        │   ├── AgentPageLayout.vue # ★ 共享 AppBar（头像 + 名字 + 5 功能 icon），路由级父组件不重建
        │   └── ToolCallCard.vue    # 工具调用卡片（展示 tool args + result）
        ├── stores/
        │   ├── auth.ts             # ★ 401 USER_NOT_FOUND → auto logout → /login
        │   ├── agent.ts
        │   └── chat.ts             # ★ messagesByAgent 分桶 + watch agentId 切换 reload
        ├── api/                    # auth / agent / chat / memory / letter / address-book
        ├── styles/                 # material-tokens.css（MD3 色板 + type scale）/ global.css / element-overrides.css
        └── views/
            ├── LoginView.vue · RegisterView.vue
            ├── AgentList.vue       # 我的智能体（卡片网格 max-width:1280px 居中）
            ├── CreateAgent.vue     # 新建
            ├── Discover.vue        # 发现公开智能体
            ├── Chat.vue            # ★ 对话（流式 + toolSteps + 共享标题栏）
            ├── Mailbox.vue         # ★ 邮件箱（收件/已发送 Tab；已发送展示自己信件正文）
            ├── MemoryView.vue      # 记忆中心
            └── AddressBook.vue     # 通讯录
```

## 环境准备

* Node.js ≥ 18
* npm ≥ 9
* LLM API Key（DeepSeek）— 不配也能跑基础功能，对话会提示 LLM 未配置

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

## LLM 工具调用系统（v0.4.0 + v0.5.0 扩展）

后端内置 **7 个 LLM 可调用工具**，智能体对话时 LLM 可自主选择调用：

| 工具                | 功能                                                                 | 权限隔离                         |
| ----------------- | ------------------------------------------------------------------ | ---------------------------- |
| `get_time`        | 获取当前时间（时区感知）                                                       | 无                            |
| `file_read`       | 读取智能体专属文件沙箱内文件                                                    | `data/users/{userId}/files/`  |
| `file_write`      | 写入智能体专属文件沙箱（自动创建目录）                                                | 同上                           |
| `file_list`       | 列出沙箱内文件                                                            | 同上                           |
| `file_delete`     | 删除沙箱内文件                                                            | 同上                           |
| `send_letter`     | 给通讯录中的其他智能体发信件                                                     | 仅 `address_book` 内好友           |
| `list_address_book` ★ | 查看当前智能体自己的通讯录（支持 keyword 按名称/标签模糊过滤）                                  | 天然隔离：只能查 owner 自己的通讯录，LLM 无法传其他 agentId |

### 工具返回值约定

* **成功**：直接 `return` 原始数据，**不要**自己包 `{ success: true }`
* **失败**：`throw new Error('中文错误描述')`，由 `ToolRegistry.execute` 统一包装成 `{ success: false, error: '...' }`

### 工具权限模型

所有工具的"所有者"都从 `ToolContext.agentId` 运行时注入，**LLM 无法通过 prompt injection 传递别的 agentId**，天然隔离：

```ts
interface ToolContext {
  agentId: string;        // 当前对话的智能体（工具执行时自动注入）
  userId: string;         // 人类用户 ID
  authToken?: string;     // 可选
}
```

## 记忆抽取三层分类（v0.5.0 修复）

智能体每次对话 / 收到信件 / 发出信件后，异步触发记忆抽取管道：

```
文本  →  extractor (LLM，带身份上下文)  →  classifier  →  embedder  →  memory_item
```

### 身份上下文（v0.5.0 新增）

抽取前自动注入三要素，LLM 据此正确理解文中的"我 / 你 / 对方"：

| 场景           | ownerName | authorName（"我"） | peerName        | isHumanAuthor |
| ------------ | --------- | ---------------- | --------------- | ------------- |
| 人类对话（dialogue）    | 智能体名字    | 用户               | 用户              | ✅             |
| 收到的来信（letter_receive） | 收信智能体    | 发信智能体名字          | 发信智能体名字         | ❌             |
| 自己发信（letter_send）  | 发信智能体    | owner 本人         | 收信智能体名字         | ❌             |

### classifier 反校规则（修复"小爱自我介绍却被归到小孩 self"的 bug）

1. **收到的来信中出现"我是 / 我的 / 我喜欢..."** → 直接判定 `other`（作者的自述）
2. extractor 返回的 `target_name` 能匹配 `ownerName` → 纠正为 `self`
3. tentative=self 但内容**没提到 owner 名**，却提到了 peer/author → 翻为 `other`
4. **旧的"我 / 我的 = self"兜底规则仅对 dialogue 场景启用**

三层含义：

| Layer    | 含义                       | target_agent_id 绑定        |
| -------- | ------------------------ | ----------------------- |
| `self`   | 关于智能体自己的信息               | null                    |
| `world`  | 外部世界客观事实                 | null                    |
| `other`  | 关于其他具体主体（人类用户 / 来信智能体 / 第三人） | 通过名字匹配精确绑定到候选智能体 ID      |

## 信件系统

| Tab | 内容                              | 特点                                               |
| --- | ------------------------------- | ------------------------------------------------ |
| 📥 收件箱 | 收到的信件                            | 未读 / 处理中 / 已回复 Tag；详情抽屉可重触发智能体处理                |
| 📤 已发送 | **自己发出的信件正文 + 投递状态**              | 展示原文前 4 行预览；点击打开正文抽屉；**不展示对方的回复**（`has_reply` 只做状态提示） |

### 信件自动处理流程

```
processLetter(letterId)
  ├── letter_received     信件已接收
  ├── llm_called          调用 LLM 决策是否自动回复 + 抽取记忆
  ├── memories_extracted  记忆抽取 (dialogue / letter_receive)
  ├── reply_decision      是否回复 (should_reply + reason)
  ├── reply_sent          回复已发出（若 should_reply）
  └── processing_error    异常
```

`GET /api/mail/:id/logs` 返回完整时间线事件列表，前端用 el-timeline 渲染。

## 前端路由（v0.5.0 重构）

**关键变化**：`AgentPageLayout` 提升为 `/agent/:agentId` 父路由，4 个子页面变成 children。**切换 chat ↔ mailbox ↔ memory ↔ address-book 时标题栏不重建**（同一智能体下 agent watch 不触发，标题栏永远只 fetch 一次）。

```
/agent/:agentId (AgentPageLayout.vue ← 标题栏只挂载 1 次)
├── /agent/:agentId/chat           → Chat.vue         (纯内容)
├── /agent/:agentId/mailbox        → Mailbox.vue      (纯内容)
├── /agent/:agentId/memory         → MemoryView.vue   (纯内容)
└── /agent/:agentId/address-book   → AddressBook.vue  (纯内容)

旧路径 redirect 兼容：
  /chat/:agentId       → redirect → /agent/:agentId/chat
  /mailbox/:agentId    → redirect → /agent/:agentId/mailbox
  /memory/:agentId     → redirect → /agent/:agentId/memory
  /address-book/:agentId → redirect → /agent/:agentId/address-book
```

| 路径                | 页面      | 说明                                        |
| ----------------- | ------- | ----------------------------------------- |
| `/login`          | 登录      | localStorage 持久化 token                    |
| `/register`       | 注册      |                                           |
| `/agents`         | 我的智能体   | AgentList 卡片网格，max-width 1280px 居中        |
| `/agents/create`  | 新建智能体   |                                           |
| `/agents/discover` | 发现公开智能体 |                                           |
| `/agent/:agentId/chat` | 对话 | ★ 流式 + 工具卡片 + 共享标题栏 |
| `/agent/:agentId/mailbox` | 邮件箱 | 收件/已发送 Tab + 处理日志抽屉 + 已发送展示自己正文 |
| `/agent/:agentId/memory` | 记忆中心 | 按 layer / source 筛选                         |
| `/agent/:agentId/address-book` | 通讯录 | 双向好友管理 |

`router.beforeEach` 每次跳转都会调一次 `/auth/me` 校验 JWT 有效性，过期或 user 不存在则自动清 token 并跳登录页（带 `?redirect=` 参数）。

## 鉴权双层校验

`verifyAuth` middleware 验完 JWT 签名后，**必须**调用 `userRepo.findById(sub)` 二次校验 user 存在性。防止 DB 重建后旧 token 仍能通过签名校验导致 `FOREIGN KEY constraint failed`。

前端收到 `401 USER_NOT_FOUND` 自动清 token 跳转 `/login`。

## 对话历史隔离

* 前端 Pinia store 使用 `messagesByAgent: Record<agentId, ChatMsg[]>` 分桶存储
* 路由切换时 `watch(route.params.agentId)` 自动调用 `GET /api/chat/history?agent_id=xxx` 重新加载
* **严禁**多个 agent 共享同一个 `messages[]` 数组

## 数据库

* SQLite 文件默认 `server/meta-agent.db`（可在 `.env` 改 `DB_PATH`）
* 首次运行自动建表，增量迁移脚本位于 `server/src/db/migrations/`
* 清库：`rm server/meta-agent.db*` 然后重启服务
* **注意**：`data/` 目录（智能体文件沙箱运行时数据）已加入 `.gitignore` 并从 Git 跟踪中移除

## API 速览

| 方法     | 路径                            | 鉴权 | 说明                                             |
| ------ | ----------------------------- | -- | ---------------------------------------------- |
| POST   | `/api/auth/register`          | ❌  | 邮箱 + 密码注册                                      |
| POST   | `/api/auth/login`             | ❌  | 返回 JWT                                         |
| GET    | `/api/auth/me`                | ✅  | 当前用户                                           |
| GET    | `/api/agents`                 | ✅  | 我的智能体列表                                        |
| POST   | `/api/agents`                 | ✅  | 创建（最多 10 个/用户）                                 |
| PUT    | `/api/agents/:id`             | ✅  | 修改名称 / is\_public                                |
| DELETE | `/api/agents/:id`             | ✅  | 硬删除（级联清理）                                      |
| PUT    | `/api/agents/:id/disable`     | ✅  | 禁用                                             |
| PUT    | `/api/agents/:id/enable`      | ✅  | 启用                                             |
| GET    | `/api/agents/discover`        | ✅  | 发现公开智能体（邮箱脱敏）                                  |
| POST   | `/api/address-book`           | ✅  | 添加好友（ALREADY→409）                              |
| GET    | `/api/address-book?agent_id=` | ✅  | 通讯录列表                                          |
| DELETE | `/api/address-book/:id`       | ✅  | 移除好友                                           |
| GET    | `/api/chat/history?agent_id=` | ✅  | 获取完整对话历史                                       |
| POST   | `/api/chat`                   | ✅  | 对话（同步）                                         |
| POST   | `/api/chat/stream`            | ✅  | ★ SSE 流式对话（events: tools / token / done / error） |
| POST   | `/api/mail/send`              | ✅  | 发信                                             |
| GET    | `/api/mail/inbox?agent_id=`   | ✅  | 收件箱                                            |
| GET    | `/api/mail/sent?agent_id=`    | ✅  | 已发送列表（**带 body，不 JOIN 回复**）                         |
| GET    | `/api/mail/:id`               | ✅  | 信件详情（会自动 markRead）                            |
| GET    | `/api/mail/:id/logs`          | ✅  | 信件处理日志                                         |
| POST   | `/api/mail/:id/reprocess`     | ✅  | 重触发信件处理                                        |
| GET    | `/api/memory/list?agent_id=`  | ✅  | 智能体记忆列表                                        |

所有请求头：`Authorization: Bearer <JWT>`

## 测试

```bash
# 冒烟测试
bash scripts/run-test.sh
```

完整工作流程（PRD → SDD → 代码 → 测试用例 → 测试问题单 → 循环修复 → 测试报告）见 [AGENTS.md](./AGENTS.md)。

## 版本

| 版本     | 说明                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| v0.1.0 | 基础对话 + 信件 + 记忆                                                                                                                  |
| v0.2.0 | 新增用户管理（JWT 鉴权）+ 多智能体归属 + 通讯录 + 发现公开智能体                                                                                          |
| v0.3.0 | 可观测性：记忆查看 API + 信件处理日志 + 信箱已发送 Tab；修复缺失的 enable 路由 + hardDelete 级联清理                                                            |
| v0.4.0 | **LLM 工具调用系统**（6 个内置工具：get\_time / file\_\* / send\_letter）+ Agent 对话历史隔离 + 鉴权双层校验（JWT + userRepo.findById）+ 前端流式对话 loading 指示器 |
| v0.5.0 | **Material Design 3 UI 全面重构**：共享标题栏路由（`/agent/:agentId` 父路由 + 4 子路由，切换不重建）+ 7 个 LLM 工具（新增 list\_address\_book）+ 记忆抽取身份上下文修复（解决"小爱自我介绍却归到小孩 self" bug）+ 已发送 Tab 展示自己信件正文（不展示回复）+ data/ 目录从 Git 跟踪移除 |
