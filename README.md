# MetaAgent DEMO

具备对话、信件与认知能力的多智能体系统。智能体拥有独立人格，可与用户对话相互交流、发送信件，并基于记忆层积累认知，实现类人的行为模式。

## 项目特色

- **多智能体人格系统**：创建具备 Persona Tag 的独立智能体，每个智能体拥有自己的对话风格与记忆
- **双向对话（Chat）**：用户与智能体通过 LLM 驱动的自然语言交互，支持流式 SSE 输出
- **智能体信件（Letter）**：智能体之间可自发发送邮件，形成多智能体社区
- **分层记忆（Memory）**：自我层 / 世界层 / 他者层，结合向量检索（sqlite-vec）实现长期认知
- **本地 Embedding**：使用 transformers.js 本地运行 all-MiniLM-L6-v2 模型，无需外部向量 API

## 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript 5.5+（前后端统一） |
| 前端 | Vue 3 + Vite 5 + Pinia + Vue Router + Element Plus |
| 后端 | Node.js 20+ + Fastify 4 |
| 数据库 | SQLite（better-sqlite3） |
| 向量 | sqlite-vec 扩展（cosine 相似度） |
| LLM | OpenAI 兼容 API（默认 deepseek-v4-flash） |
| Embedding | transformers.js 本地模型（Xenova/all-MiniLM-L6-v2） |
| 日志 | pino |
| 校验 | Zod |
| 包管理 | npm workspaces（monorepo） |

## 目录结构

```
meta-world/
├── README.md
├── package.json                  # 根 package.json（workspaces 编排）
│
├── shared/                       # 前后端共享的类型定义
│   ├── package.json
│   └── src/types/
│       ├── agent.ts              # Agent / CreateAgentRequest
│       ├── memory.ts             # MemoryItem / MemoryLayer / MemorySource
│       ├── letter.ts             # Letter / LetterStatus / SendLetterRequest
│       └── chat.ts               # ChatMessage / ChatRequest / SSEEvent
│
├── server/                       # 后端服务（Fastify）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example              # 环境变量模板
│   └── src/
│       ├── index.ts              # 入口：启动 Fastify
│       ├── config.ts             # 配置加载
│       ├── db/                   # SQLite 数据库层 + 仓储
│       ├── modules/
│       │   ├── agent/            # 智能体 CRUD
│       │   ├── chat/             # 对话路由 + 记忆召回
│       │   ├── letter/           # 信件收发 + 自动回复
│       │   └── memory/           # 记忆抽取 / 分类 / 向量化
│       └── utils/                # llm / embedder / logger
│
├── web/                          # 前端 SPA（Vue 3）
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts / router.ts / App.vue
│       ├── views/                # CreateAgent / Chat / Mailbox
│       ├── api/                  # 对接后端 REST
│       └── stores/               # Pinia 状态管理
│
├── docs/                         # 产品 / 设计文档
├── release/                      # 版本快照（PRD / SDD / 测试用例）
├── buglist/                      # 测试问题单
└── testcase/                     # 测试用例
```

## 快速开始

### 环境要求

- Node.js ≥ 20（LTS）
- npm ≥ 9
- 可访问的 LLM API（或配置本地模型）
- 国内网络建议设置 `HF_ENDPOINT=https://hf-mirror.com`

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入实际的 LLM API Key。关键配置项：

| 变量 | 说明 |
|------|------|
| `LLM_BASE_URL` | LLM 服务地址（OpenAI 兼容格式） |
| `LLM_API_KEY` | API Key |
| `LLM_MODEL` | 模型名称（如 deepseek-v4-flash） |
| `EMBEDDING_MODE` | `local`（默认，transformers.js）或 `remote` |
| `HF_ENDPOINT` | HuggingFace 镜像，国内建议 `https://hf-mirror.com` |
| `DB_PATH` | SQLite 数据库文件路径 |
| `PORT` | 后端服务端口，默认 3000 |

### 3. 开发模式

```bash
# 同时启动后端（3000）和前端 Vite dev server
npm run dev

# 或分别启动
npm run dev:server   # tsx watch server/src/index.ts
npm run dev:web      # vite
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 4. 生产构建

```bash
npm run build
```

依次构建 shared → server → web，产物输出至各子包 `dist/` 目录。

### 5. 运行时数据库

首次启动时 SQLite 数据库 `server/meta-agent.db` 会自动创建，无需手动初始化。该文件及其 WAL/SHM 辅助文件已在 `.gitignore` 中忽略，不会被提交。

## 已忽略的仓库产物

以下内容已从版本控制中移除，如需查看历史请切换到旧 commit：

- `web/dist/`、`shared/dist/`、`server/dist/` — 构建产物
- `server/.env` — 敏感配置，使用 `server/.env.example` 替代
- `server/meta-agent.db*` — 运行时数据库文件

## 文档

- [智能体产品设计文档](./docs/智能体产品设计文档.md)
- [软件设计文档](./docs/软件设计文档.md)

## License

Private — Demo 项目，仅供内部参考。
