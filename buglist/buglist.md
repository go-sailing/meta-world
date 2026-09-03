# Bug List — MetaAgent DEMO 测试问题单

| 文档信息          | 内容                                                |
| ------------- | ------------------------------------------------- |
| 版本            | v0.3（本地 Embedding 回归后）                            |
| 最后更新          | 2026-09-03 07:31                                  |
| LLM           | DeepSeek v4-flash                                 |
| **Embedding** | **✅ 本地 transformers.js all-MiniLM-L6-v2 (384 维)** |
| sqlite-vec    | ❌ 缺失 → 用 fallback（Node 层余弦距离），功能正常                |

***

## 回归测试结果 v0.3

| 指标       | 数值     |
| -------- | ------ |
| 执行用例     | 15     |
| **PASS** | **15** |
| FAIL     | 0      |

### 最终 DB 快照

```
agent        2
chat_message 4
letter       3
memory_item  9  ← 三层认知 self/world/other 都产生了！
memory_vec   9  ← 和 memory_item 1:1，本地 embedding 完全打通 ✅
```

### 三层认知分布（第一次看到 self+world+other 三层都有！）

```
self | dialogue    1  ← 对自己的认知（之前缺失）
world| letter_receive 1  ← 对"北京下雨"的世界知识（之前缺失）
other| dialogue    6  ← 对"小明喜欢徒步/科幻"的他人画像
other| letter_send 1  ← 信件里对收件方的认知
```

### 关键里程碑测试

**TC-F4-04 跨会话记忆召回** — 首次完整通过 ✨

```
用户: "我叫小明，喜欢徒步和科幻"
（→ 被抽取成 memory_item[other] + 本地 embedding 写入 memory_vec）
...15 秒后...
用户: "我叫什么名字？我喜欢什么？"
智能体: "当然记得！你是小明呀，喜欢徒步和科幻电影。这两个爱好组合起来特别有意思..."
```

—— 这是向量召回 + prompt 注入的铁证，不是 LLM 靠窗口记忆蒙的。

***

## 问题清单（全部为历史问题，现状态一览）

| 编号      | 等级 | 问题                      | 状态             | 修复方式                             |
| ------- | -- | ----------------------- | -------------- | -------------------------------- |
| BUG-001 | P0 | Fastify Zod schema 启动报错 | ✅ v0.2 已修复     | 换成 JSON Schema                   |
| BUG-002 | P1 | error handler 覆盖 400    | ✅ v0.2 已修复     | `(err as any).statusCode ?? 500` |
| BUG-003 | P0 | Embedding API 不可用       | ✅ **v0.3 已解决** | 切换到本地 transformers.js            |
| BUG-004 | P2 | sqlite-vec.so 缺失        | ⚠️ 降级可用        | Node 层余弦距离 fallback              |
| BUG-005 | P3 | LLM 错误信息模糊              | 💡 建议改进        | 透传具体 status code                 |
| BUG-006 | P3 | 信件无自动重试                 | 💡 建议改进        | 指数退避重试 2 次                       |

## v0.3 新增技术债务

| 项                             | 说明                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| **undici 依赖 hoist 到根目录**      | monorepo hoist 策略下 server/ 直接 `import('undici')` 能跑，但 `npm install` 只装到根目录。建议显式在 server/package.json 声明 |
| **transformers.js 模型首次下载**    | 约 20-30s（hf-mirror + 代理），模型存到 `~/.cache/huggingface`，后续启动秒级加载                                           |
| **global-fetch monkey-patch** | undici ProxyAgent 覆盖 `globalThis.fetch`，对 Fastify 本身无副作用（Fastify 用 node:http），但项目其他地方用 fetch 都会走代理      |
| **sqlite-vec fallback 性能**    | Node 层余弦距离 O(N)，DEMO ≤ 50 条记忆无感知；≥ 500 条建议安装 sqlite-vec.so                                              |

