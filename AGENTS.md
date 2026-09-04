# AGENTS.md — MetaAgent 项目协作指南

> 本文件定义 AI Agent 与人类协作时必须遵守的工作流程和环境配置。
> 任何涉及本仓库的开发任务都必须从阅读本文件开始。

***

## 🧭 工作流程（强制 9 步）

所有需求/BUG 修复必须严格按以下顺序执行，不可跳步：

```
┌──────────────────────────────────────────────────────────────┐
│  step1  编写产品设计文档（PRD）                               │
│    ↓                                                          │
│  step2  编写软件设计文档（SDD）                               │
│    ↓                                                          │
│  step3  编写代码                                              │
│    ↓                                                          │
│  step4  编写测试用例文档                                       │
│    ↓                                                          │
│  step5  执行测试用例 → 输出测试问题单                         │
│    ↓                                                          │
│  step6  修改测试问题                                          │
│    ↓                                                          │
│  step7  回归测试                                              │
│    ↓                                                          │
│  step8  循环 step6 → step7，直到问题全部关闭 ✅              │
│    ↓                                                          │
│  step9  编写测试报告                                          │
└──────────────────────────────────────────────────────────────┘
```

### 各步骤产出物

| 步骤      | 产出物                   | 存放位置                           |
| ------- | --------------------- | ------------------------------ |
| step1   | PRD（背景、目标、用户故事、功能需求）  | `docs/prd/*.md`                |
| step2   | SDD（架构、模块设计、API、数据结构） | `docs/sdd/*.md`                |
| step3   | 源码                    | `server/` + `web/` + `shared/` |
| step4   | 测试用例文档                | `docs/testcases/*.md`          |
| step5   | 测试问题单（ISSUE 列表）       | `docs/issues/*.md`             |
| step6-8 | 修复 commit + 回归通过记录    | 同 step5 文件更新状态                 |
| step9   | 测试报告（通过率、覆盖率、遗留问题）    | `docs/reports/*.md`            |

***

## 🔧 项目架构速览

```
/workspace
├── server/          # 后端：Fastify + SQLite + JWT + LLM 工具调用
│   ├── src/
│   │   ├── index.ts            # 入口
│   │   ├── modules/            # 业务模块 (agent/chat/letter/memory/auth)
│   │   ├── tools/              # LLM 可调用工具 (get_time/file_*/send_letter)
│   │   ├── middleware/         # auth + ownership 鉴权
│   │   └── db/                 # schema + repositories
│   └── .env                    # API Key / 代理 / LLM 配置
├── web/             # 前端：Vue 3 + Vite + Pinia + Element Plus
│   └── src/
│       ├── views/              # Chat / AgentList / Memory / Mailbox
│       ├── stores/             # pinia (agent / chat / auth)
│       └── api/                # 与后端通信
├── shared/          # 前后端共享类型定义
└── docs/            # 设计文档 / 测试用例 / 问题单 / 测试报告
```

### 启动命令

```bash
# 后端（端口 3000）
cd /workspace/server && npx tsx src/index.ts

# 前端（端口 5173）
cd /workspace/web && npx vite --host 0.0.0.0 --port 5173
```

***

## 🤖 LLM 配置（默认测试配置）

> 后端 `.env` 中应包含以下值。如缺失请手动配置：

| 参数             | 值                                     | 说明               |
| -------------- | ------------------------------------- | ---------------- |
| `LLM_PROVIDER` | `deepseek`                            | 当前唯一支持的 provider |
| `LLM_BASE_URL` | `https://api.deepseek.com`            | DeepSeek API 端点  |
| `LLM_API_KEY`  | `sk-0250e96f0ee342348a1e6551f8f06eba` | 测试用 API Key      |
| `LLM_MODEL`    | `deepseek-v4-flash`                   | 默认模型             |

### 代理

沙箱环境 HTTP 代理已在 `.env` 中配置：

```
HTTP_PROXY=http://127.0.0.1:18080
HTTPS_PROXY=http://127.0.0.1:18080
```

后端已通过 `ProxyAgent` 显式使用，前端 Vite dev server 自动读取。

***

## 🧩 核心约定

### 1. 工具返回值规范

LLM 工具（`server/src/tools/builtins/`）必须：

* **成功**：直接 `return` 原始数据（Object / String / Number），**不要**自己包 `{ success: true }`

* **失败**：`throw new Error('中文错误描述')`，由 `ToolRegistry.execute` 统一包装成 `{ success: false, error: '...' }`

### 2. 对话历史隔离

* 前端 store `chat.ts` 使用 `messagesByAgent: Record<agentId, ChatMsg[]>` 分桶

* 路由切换时 `watch(route.params.agentId)` 自动调用 `GET /api/chat/history?agent_id=xxx` 重新加载

* **严禁**多个 agent 共享同一个 `messages[]` 数组

### 3. 鉴权双层校验

`verifyAuth` middleware 验完 JWT 签名后，**必须**调用 `userRepo.findById(sub)` 二次校验 user 存在性，防止 DB 重建后旧 token 导致外键约束失败。

### 4. 数据库

* SQLite 文件：`/workspace/server/meta-agent.db`

* schema：`server/src/db/schema.sql`（全新库直接执行）

* 重建前**务必**通知用户，重建后前端需强制重新登录（401 → logout → 跳转 /login）

***

## 📝 提交代码前 Checklist

* [ ] 后端 `tsx` 启动无报错，工具全部注册

* [ ] 前端 `vite` 启动无编译错误

* [ ] `curl http://localhost:3000/health` 返回 `{"status":"ok"}`

* [ ] 新增 API 已加 auth + ownership 鉴权

* [ ] 测试问题单全部关闭（step8 完成）

* [ ] `docs/issues/` 对应 ISSUE 状态已更新

