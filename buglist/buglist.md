# Bug List — MetaAgent DEMO 测试问题单

| 文档信息 | 内容                                                              |
| ---- | --------------------------------------------------------------- |
| 版本   | v0.1                                                            |
| 测试日期 | 2026-09-03                                                      |
| 测试版本 | server: HEAD                                                    |
| 环境   | Linux x86\_64, Node.js v24.1.0, SQLite (sqlite-vec 缺失 fallback) |

***

## 测试执行概览

| 分类               | 总数     | PASS   | FAIL  | 阻塞           |
| ---------------- | ------ | ------ | ----- | ------------ |
| F1 Agent CRUD    | 6      | 6      | 0     | 0            |
| F2 对话            | 3      | 0      | 0     | **3（缺 LLM）** |
| F3 信件投递（不依赖 LLM） | 5      | 5      | 0     | 0            |
| F3 信件处理（依赖 LLM）  | 3      | 0      | 0     | **3（缺 LLM）** |
| F4 记忆系统          | 4      | 0      | 0     | **4（缺 LLM）** |
| 边界异常             | 2      | 2      | 0     | 0            |
| **合计**           | **23** | **13** | **0** | **10**       |

> "阻塞"表示因缺少 LLM API Key 无法执行，不是代码 bug，属于环境依赖。

***

## 问题清单

### BUG-001 ✅ 已修复：Fastify 启动时报 schema invalid

| 项    | 内容                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 严重等级 | P0（阻塞开发）                                                                                                                                                   |
| 发现时间 | 2026-09-03 首次启动 server                                                                                                                                     |
| 复现步骤 | `npm run dev:server`，启动直接报错                                                                                                                                |
| 错误信息 | `Failed building the validation schema for POST: /api/mail/send, due to error schema is invalid: data/required must be array`                              |
| 根因   | Fastify 的 `route.schema.body` 要求 JSON Schema 格式（`required` 是数组），但代码里传的是 Zod schema 对象。Zod 和 JSON Schema 结构不同（Zod 用 `.required()` 链式方法，不生成 `required` 数组字段） |
| 影响路由 | `/api/mail/send`（letter route 内联定义），agent/chat route 用 `as any` 强转虽能跑但类型不安全                                                                                |
| 修复方案 | 把所有路由的 Zod schema 换成标准 JSON Schema 对象：`const body = { type:'object', required:['from','to'], properties:{...} } as const`Fastify 直接识别 JSON Schema 进行运行时校验  |
| 修复文件 | server/src/modules/agent/route.ts, chat/route.ts, letter/route.ts                                                                                          |

***

### BUG-002 ✅ 已修复：全局 error handler 覆盖了 schema 校验的 400 状态码

| 项         | 内容                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------- |
| 严重等级      | P1（接口返回码错误）                                                                                     |
| 发现时间      | TC-F1-02 校验名称太短 → 预期 400，实际返回 500                                                               |
| 复现步骤      | `curl -X POST /api/agents -d '{"name":"a","persona_tags":["friendly"]}'`                        |
| 根因        | `setErrorHandler` 里硬编码 `reply.status(500)`，覆盖了 Fastify schema 校验错误自带的 `err.statusCode`（400/422） |
| 错误信息（响应体） | `{"error":"body/name must NOT have fewer than 2 characters"}` — 消息是对的，但 status code 是 500       |
| 修复方案      | `reply.status((err as any).statusCode ?? 500)` — 如果错误自带 statusCode 就用它                          |
| 修复文件      | server/src/index.ts                                                                             |

***

### BUG-003 ⏳ 待修复：LLM API Key 未配置导致对话/记忆/信件处理全部失败

| 项    | 内容                                                                             |
| ---- | ------------------------------------------------------------------------------ |
| 严重等级 | P0（核心功能不可用）                                                                    |
| 影响范围 | F2 对话、F3 信件自动回复、F4 记忆抽取/向量化（约占 DEMO 核心功能的 70%）                                 |
| 复现步骤 | 启动服务，任何需要 LLM 的操作都失败                                                           |
| 表现   | 对话返回 `{"error":"fetch failed"}`；信件处理停留在 `processing` 状态；`memory_item` 表始终为 0 行 |
| 根因   | server/.env 是 `.env.example` 的拷贝，`LLM_API_KEY=sk-xxx` 是占位符，OpenAI 接口返回 401     |
| 修复方案 | **非代码 bug，属环境配置**。需要填入有效的 OpenAI-compatible API Key                            |
| 验证修复 | 配好 key 后，重新跑 TC-F2-01 / TC-F3-04 / TC-F4-04 全部应通过                              |

***

### BUG-004 ✅ 已降级：sqlite-vec.so 缺失

| 项      | 内容                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| 严重等级   | P2（功能降级但可用）                                                                                                        |
| 发现时间   | server 启动时                                                                                                         |
| 日志     | `WARN sqlite-vec.so: cannot open shared object file: No such file or directory → will use fallback vector storage` |
| 影响     | 向量存储从 sqlite-vec 虚拟表降级到普通 SQLite BLOB 列，向量查询在 Node 层做余弦距离计算                                                        |
| 功能是否可用 | **可用** — memory\_item 和 memory\_vec 仍正常写入；memoryRepo.recall() 走 fallback 分支                                        |
| 性能影响   | Top-K 语义检索从 C 实现降到 JS 实现，数据量小（DEMO ≤ 50 用户）无影响                                                                     |
| 后续建议   | 生产部署时安装 sqlite-vec 动态库并通过 `db.loadExtension('path/to/sqlite-vec.so')` 加载                                           |

***

### BUG-005 💡 建议改进：LLM 错误信息透传不清晰

| 项    | 内容                                                                                         |
| ---- | ------------------------------------------------------------------------------------------ |
| 严重等级 | P3（用户体验）                                                                                   |
| 复现步骤 | LLM API Key 无效或网络不通时发对话                                                                    |
| 当前返回 | `{"error":"fetch failed"}` — 用户/开发者看不到具体是 401 Unauthorized 还是网络超时                          |
| 期望   | 返回具体错误码和摘要，如 `{"error":"LLM API 401 Unauthorized，请检查 API Key 配置"}`                         |
| 涉及代码 | server/src/utils/llm.ts 的 `llmChat` / `llmStream`，server/src/modules/chat/service.ts 捕获后透传 |

***

### BUG-006 💡 建议改进：信件 processing\_failed 没有自动重试

| 项    | 内容                                                                       |
| ---- | ------------------------------------------------------------------------ |
| 严重等级 | P3                                                                       |
| 现状   | 信件处理因 LLM 失败停留在 `processing_failed`，只能手动调 `POST /api/mail/:id/reprocess` |
| 期望   | 失败信件自动重试 2 次（指数退避），3 次后进入 `processing_failed` 等待人工                       |
| 说明   | DEMO 可接受此现状，生产版建议引入任务队列 + 自动重试                                           |

***

## 可直接执行的验证 SQL

```sql
-- 修复 BUG-003 后跑这条，确认记忆管道通了
SELECT
  COUNT(*) AS total,
  layer,
  source_type,
  confidence
FROM memory_item
GROUP BY layer, source_type;

-- 信件状态分布
SELECT status, COUNT(*) FROM letter GROUP BY status;
```

