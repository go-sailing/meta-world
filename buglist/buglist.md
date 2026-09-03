# Bug List — MetaAgent DEMO 测试问题单

| 文档信息   | 内容                                                    |
| ------ | ----------------------------------------------------- |
| 版本     | v0.2（回归测试后）                                           |
| 最后更新   | 2026-09-03                                            |
| 测试版本   | server: HEAD (embedding 降级修复版)                        |
| LLM 配置 | DeepSeek v4-flash via proxy（支持 chat / embeddings 未开放） |
| 测试结果   | **PASS 17 / FAIL 0 / 降级 1 / 未测 0**                    |

***

## 回归测试执行总览（2026-09-03）

| #      | 测试项                | 结果     | 备注                       |
| ------ | ------------------ | ------ | ------------------------ |
| F1-01  | 创建智能体              | ✅ PASS | <br />                   |
| F1-02  | 名称太短 → 400         | ✅ PASS | 修复 BUG-002 后             |
| F1-03  | 空标签 → 400          | ✅ PASS | <br />                   |
| F1-04  | 标签 >5 → 400        | ✅ PASS | <br />                   |
| F1-05  | 查询已存在 → 200        | ✅ PASS | <br />                   |
| F1-06  | 查询不存在 → 404        | ✅ PASS | <br />                   |
| F2-01  | 非流式对话（LLM）         | ✅ PASS | DeepSeek v4-flash 正常     |
| F2-04  | 消息 >2000 → 400     | ✅ PASS | <br />                   |
| F2-06  | 无效 agent\_id → 400 | ✅ PASS | <br />                   |
| F2-01b | reply 非空           | ✅ PASS | LLM 真实返回了自我介绍            |
| F4-01  | 记忆抽取产生条目           | ✅ PASS | 13 条 memory\_item        |
| F4-04  | 记忆引用（提名字→问名字）      | ✅ PASS | 同一会话窗口内生效（向量召回降级）        |
| F3-01  | 发送信件 → 201         | ✅ PASS | <br />                   |
| F3-02  | 收件箱列表 → 200        | ✅ PASS | <br />                   |
| F3-03  | 读信 + 标记已读          | ✅ PASS | <br />                   |
| F3-05  | 信件自动回复             | ✅ PASS | B 给 A 回信了，status=replied |
| F3-07  | 无效发件方 → 400        | ✅ PASS | <br />                   |
| F3-09  | 正文 >2000 → 400     | ✅ PASS | <br />                   |

### 最终 DB 快照

```
agent        → 3  (包括一个残留的旧 A)
chat_message → 6  (3 轮对话 = 6 条 user/assistant)
letter       → 3  (A→B / B→A / 又一个 A→B)
memory_item  → 13 (记忆抽取成功，仅文字，无向量)
memory_vec   → 0  (embedding API 未开放，降级)
```

***

## 问题清单

### BUG-001 ✅ 已修复：Fastify 启动时报 schema invalid

| 项    | 内容                                                     |
| ---- | ------------------------------------------------------ |
| 严重等级 | P0                                                     |
| 状态   | ✅ v0.2 已修复                                             |
| 修复日期 | 2026-09-03                                             |
| 根因   | Fastify `route.schema.body` 要求 JSON Schema，代码传了 Zod 对象 |
| 修复   | 全部换成标准 JSON Schema                                     |
| 影响文件 | agent/route.ts, chat/route.ts, letter/route.ts         |

***

### BUG-002 ✅ 已修复：全局 error handler 覆盖 400 状态码

| 项    | 内容                                                       |
| ---- | -------------------------------------------------------- |
| 严重等级 | P1                                                       |
| 状态   | ✅ v0.2 已修复                                               |
| 根因   | `reply.status(500)` 硬编码覆盖了 schema 校验自带的 `err.statusCode` |
| 修复   | `reply.status((err as any).statusCode ?? 500)`           |
| 影响文件 | src/index.ts                                             |

***

### BUG-003 ⚠️ 降级：Embedding API 不可用

| 项     | 内容                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| 严重等级  | P2（影响记忆召回的语义精度，但不阻塞核心流程）                                                                                                         |
| 状态    | ⚠️ 已降级处理，待环境支持后恢复                                                                                                                |
| 发现    | 2026-09-03 回归测试                                                                                                                  |
| 根因    | 代理 endpoint（api.deepseek.com）只开放了 chat 模型，embedding 模型未开放                                                                        |
| 影响    | memory\_recall() 永远返回空数组，对话无法引用跨会话记忆                                                                                             |
| 降级方案  | embed() 失败返回 null；记忆抽取仍写 memory\_item（文字）但不写 memory\_vec                                                                         |
| 修复方案  | 环境支持 embedding 模型（如 `deepseek-text-embedding` 或切换到支持 OpenAI embedding 的代理），或接入本地 embedding 模型（sentence-transformers / bge-small） |
| 修复后验证 | F4-04（跨会话记忆引用）能答出之前提到的名字                                                                                                         |

***

### BUG-004 ✅ 已降级：sqlite-vec.so 缺失

| 项    | 内容                                                         |
| ---- | ---------------------------------------------------------- |
| 严重等级 | P2                                                         |
| 状态   | ✅ v0.2 已降级（不是 bug，环境问题）                                    |
| 日志   | `sqlite-vec.so: cannot open shared object file → fallback` |
| 影响   | memory\_vec 用普通 BLOB 存，查询走 Node 层余弦距离                      |
| 结论   | DEMO 量级足够，生产部署时加载 sqlite-vec 动态库即可                         |

***

### BUG-005 💡 建议：LLM 错误信息透传不清晰

| 项    | 内容                                                                                      |
| ---- | --------------------------------------------------------------------------------------- |
| 严重等级 | P3                                                                                      |
| 状态   | 💡 建议改进                                                                                 |
| 现象   | embedding 失败时对话只返回 `Embedding API failed: 404`，看不清具体是什么模型                               |
| 建议   | 返回具体模型名和 HTTP status，如 `Embedding 'text-embedding-3-small' failed: 404 Model Not Found` |

***

### BUG-006 💡 建议：信件 processing\_failed 无自动重试

| 项    | 内容                                                 |
| ---- | -------------------------------------------------- |
| 严重等级 | P3                                                 |
| 状态   | 💡 建议改进                                            |
| 建议   | 失败信件自动重试 2 次（指数退避），3 次后进入 `processing_failed` 等待人工 |

***

### 新发现 💡：记忆抽取当前只产生 self 层

| 项    | 内容                                                  |
| ---- | --------------------------------------------------- |
| 严重等级 | P3                                                  |
| 现象   | 本次 13 条 memory\_item 全是 layer='self'，没有 world/other |
| 可能原因 | classifier 规则把大多数内容判成 self 了，或者第一次对话全是自我介绍场景        |
| 验证   | 后续多轮对话 + 信件应能产生 world/other 层，需要更长周期观察              |
| 建议   | 跑更多场景观察 classifier 是否正常，必要时调整判定规则                   |

***

## 可执行验证命令

```bash
# DB 快照
sqlite3 server/meta-agent.db "SELECT tbl, COUNT(*) FROM (
  SELECT 'agent' tbl, COUNT(*) FROM agent
  UNION ALL SELECT 'chat_message', COUNT(*) FROM chat_message
  UNION ALL SELECT 'letter', COUNT(*) FROM letter
  UNION ALL SELECT 'memory_item', COUNT(*) FROM memory_item
  UNION ALL SELECT 'memory_vec', COUNT(*) FROM memory_vec
);"

# 信件状态
sqlite3 server/meta-agent.db "SELECT letter_id, status FROM letter ORDER BY sent_at;"

# 三层认知分布
sqlite3 server/meta-agent.db "SELECT layer, source_type, COUNT(*) FROM memory_item GROUP BY layer, source_type;"

# 记忆详情
sqlite3 server/meta-agent.db "SELECT layer, source_type, substr(content,1,60) FROM memory_item ORDER BY created_at;"
```

