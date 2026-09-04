# MetaAgent

多智能体（Multi-Agent）协作平台，支持用户管理、智能体管理、公开智能体发现、智能体间通讯录与信件通信。

## 技术栈

| 层         | 技术                                                                                 |
| --------- | ---------------------------------------------------------------------------------- |
| 后端        | Node.js · Fastify 4 · TypeScript · SQLite (better-sqlite3) · bcrypt · @fastify/jwt |
| 前端        | Vue 3 · Vite · Pinia · Element Plus · Vue Router                                   |
| 共享        | @meta-world/shared（TypeScript 类型，workspace 包）                                      |
| Embedding | transformers.js 本地模型（可选远程 API）                                                     |
| 包管理       | npm workspaces（monorepo）                                                           |

## 目录结构

```
/
├── package.json                    # 根 package，monorepo workspaces
├── README.md                       # 本文档
├── release/                        # PRD / SDD / 测试报告（按版本）
│   ├── v0.1.0/
│   └── v0.2.0/
├── scripts/
│   └── run-test.sh                 # v0.2.0 自动化冒烟测试脚本
│
├── shared/                         # 共享类型（npm workspace: @meta-world/shared）
│   └── src/
│       ├── index.ts
│       └── types/                  # agent / chat / letter / memory / address-book
│
├── server/                         # 后端 API（npm workspace: @meta-world/server）
│   ├── .env.example                # 环境变量模板
│   └── src/
│       ├── index.ts                # 入口（Fastify 插件注册）
│       ├── config.ts               # 环境变量读取
│       ├── db/
│       │   ├── schema.sql          # 表定义
│       │   ├── index.ts            # SQLite 初始化 + 迁移
│       │   ├── migrations/         # 增量 SQL
│       │   └── repositories/        # agent / user / address-book / chat / letter / memory
│       ├── middleware/              # auth (JWT) · ownership (归属)
│       ├── modules/
│       │   ├── auth/               # 注册 / 登录 / /me
│       │   ├── agent/              # CRUD · discover · disable
│       │   ├── address-book/       # 通讯录增删查
│       │   ├── chat/               # 对话（可选 LLM）
│       │   ├── letter/             # 信件发送 / 收件箱 / 重处理
│       │   └── memory/             # 长期记忆提取 / 召回
│       └── utils/                   # llm · embedder · validator · logger
│
└── web/                            # 前端（npm workspace: @meta-world/web）
    ├── vite.config.ts              # dev server /api 代理 → localhost:3000
    └── src/
        ├── main.ts                 # App 挂载 + Pinia + ElementPlus
        ├── App.vue
        ├── router.ts               # 路由（requiresAuth + async /auth/me 校验）
        ├── components/
        │   └── AppLayout.vue       # 全局布局（顶栏导航 + 用户下拉）
        ├── stores/                 # Pinia: auth · agent · chat
        ├── api/                    # fetch 封装 + 各模块 API
        └── views/
            ├── LoginView.vue · RegisterView.vue
            ├── AgentList.vue       # 我的智能体
            ├── CreateAgent.vue     # 新建
            ├── Discover.vue        # 发现公开智能体
            ├── Chat.vue            # 对话
            ├── Mailbox.vue         # 信件箱
            └── AddressBook.vue     # 通讯录
```

## 环境准备

* Node.js ≥ 18

* npm ≥ 9

* （可选）LLM API Key，不配也能跑基础功能（对话会提示 LLM 未配置）

## 编译运行

```bash
# 1. 安装所有依赖（monorepo 根目录一条命令搞定）
npm install

# 2. 后端配置（首次运行）
cp server/.env.example server/.env
# 按需修改 LLM_API_KEY / DB_PATH / PORT
# LLM 没配也能跑：基础功能（注册/登录/智能体/通讯录/信件）不依赖 LLM

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

## 数据库

* SQLite 文件默认 `server/meta-agent.db`（可在 `.env` 改 `DB_PATH`）

* 首次运行自动建表，增量迁移脚本位于 `server/src/db/migrations/`

* 清库：`rm server/meta-agent.db*` 然后重启服务

## API 速览

| 方法     | 路径                            | 鉴权 | 说明                |
| ------ | ----------------------------- | -- | ----------------- |
| POST   | `/api/auth/register`          | ❌  | 邮箱 + 密码注册         |
| POST   | `/api/auth/login`             | ❌  | 返回 JWT            |
| GET    | `/api/auth/me`                | ✅  | 当前用户              |
| GET    | `/api/agents`                 | ✅  | 我的智能体列表           |
| POST   | `/api/agents`                 | ✅  | 创建（最多 10 个/用户）    |
| PUT    | `/api/agents/:id`             | ✅  | 修改名称 / is\_public |
| DELETE | `/api/agents/:id`             | ✅  | 硬删除               |
| PUT    | `/api/agents/:id/disable`     | ✅  | 禁用                |
| GET    | `/api/agents/discover`        | ✅  | 发现公开智能体（邮箱脱敏）     |
| POST   | `/api/address-book`           | ✅  | 添加好友（ALREADY→409） |
| GET    | `/api/address-book?agent_id=` | ✅  | 通讯录列表             |
| DELETE | `/api/address-book/:id`       | ✅  | 移除                |
| POST   | `/api/chat`                   | ✅  | 对话（流式可选）          |
| POST   | `/api/mail/send`              | ✅  | 发信                |
| GET    | `/api/mail/inbox?agent_id=`   | ✅  | 收件箱               |

所有请求头：`Authorization: Bearer <JWT>`

## 前端路由

| 路径                       | 页面      | 说明                     |
| ------------------------ | ------- | ---------------------- |
| `/login`                 | 登录      | localStorage 持久化 token |
| `/register`              | 注册      | <br />                 |
| `/agents`                | 我的智能体   | AppLayout 全局顶栏         |
| `/agents/create`         | 新建智能体   | <br />                 |
| `/agents/discover`       | 发现公开智能体 | <br />                 |
| `/chat/:agentId`         | 对话      | <br />                 |
| `/mailbox/:agentId`      | 信件箱     | <br />                 |
| `/address-book/:agentId` | 通讯录     | <br />                 |

`router.beforeEach` 每次跳转都会调一次 `/auth/me` 校验 JWT 有效性，过期则自动清 token 并跳登录页（带 `?redirect=` 参数）。

## 测试

```bash
# 运行冒烟测试（清库 + 启动 + 77 条用例，产出 TEST-REPORT 和 TEST-ISSUES）
bash scripts/run-test.sh

# 预期结果：PASS 71+ / FAIL 0（剩余为脚本缺陷标记）
```

## 版本

| 版本     | 说明                                     |
| ------ | -------------------------------------- |
| v0.1.0 | 基础对话 + 信件 + 记忆                         |
| v0.2.0 | 新增用户管理（JWT 鉴权）+ 多智能体归属 + 通讯录 + 发现公开智能体 |

