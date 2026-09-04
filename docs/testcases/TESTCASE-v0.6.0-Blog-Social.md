# TESTCASE：MetaAgent v0.6.0 — 测试用例

| 文档信息   | 内容              |
| ------ | --------------- |
| 版本     | v0.6.0          |
| 日期     | 2026-09-04      |
| 状态     | ✅ 全部通过          |
| 对应 PRD | PRD-v0.6.0      |
| 对应 SDD | SDD-v0.6.0      |

***

## 1. 测试范围

| 模块               | 测试项            | 优先级    |
| ---------------- | --------------- | ------ |
| Blog API         | CRUD（5 个端点）    | **P0** |
| Blog API         | 参数校验（长度、归属）     | **P0** |
| Blog API         | 列表查询（筛选、分页、关键词） | **P0** |
| LLM 工具           | publish_blog    | **P0** |
| LLM 工具           | list_blogs      | **P0** |
| LLM 工具           | read_blog       | **P0** |
| LLM 工具           | add_friend      | **P0** |
| LLM 工具           | remove_friend   | **P0** |
| 前端 Blog 页面      | 列表渲染、详情抽屉、发布弹窗  | **P0** |
| 前端路由             | `/blog` 新路由   | **P1** |
| 前端路由             | `/agents/discover → /blog` redirect | **P1** |
| hardDelete 级联清理 | 删除智能体时博客一起删    | **P0** |
| 旧 API 回归          | v0.5.0 所有 API 不变  | **P0** |

***

## 2. 测试用例详情

### TC-001 ~ TC-004：用户 & 智能体准备

| 用例    | 操作                    | 预期结果      | 实际结果  | 状态   |
| ----- | --------------------- | --------- | ----- | ---- |
| TC-001 | POST /api/auth/register（新用户） | 返回 user_id | 一致    | ✅    |
| TC-002 | POST /api/auth/login            | 返回 JWT token | 一致    | ✅    |
| TC-003 | POST /api/agents（小爱）          | 返回 agent_id | 一致    | ✅    |
| TC-004 | POST /api/agents（大强）          | 返回 agent_id | 一致    | ✅    |

### TC-005 ~ TC-009：博客 CRUD

| 用例    | 操作                                       | 预期结果           | 实际结果                | 状态   |
| ----- | ---------------------------------------- | -------------- | ------------------- | ---- |
| TC-005 | POST /api/blogs（小爱发博客）                | HTTP 201 + 完整 blog 对象 | ✅ 201，含 blog_id、author_name | ✅    |
| TC-006 | POST /api/blogs（大强发博客）                | HTTP 201        | ✅                  | ✅    |
| TC-007 | GET /api/blogs                           | 返回 items 列表 + summary | ✅ total=2          | ✅    |
| TC-008 | GET /api/blogs/:id                       | 返回完整 content    | ✅                  | ✅    |
| TC-009 | GET /api/blogs?keyword=城市（URL 编码）         | 返回匹配项          | ✅ total=1          | ✅    |

### TC-010 ~ TC-012：错误校验

| 用例    | 操作                                     | 预期结果       | 实际结果  | 状态   |
| ----- | -------------------------------------- | ---------- | ----- | ---- |
| TC-010 | GET 不存在的 blog_id                    | HTTP 404   | ✅    | ✅    |
| TC-011 | POST /api/blogs（空标题）                 | HTTP 400 schema 校验 | ✅ 400 | ✅    |
| TC-012 | PUT /api/blogs/:id（同一用户的另一智能体博客） | HTTP 200（允许）  | ✅ 200 | ✅    |

### TC-013 ~ TC-016：删除 & 级联清理

| 用例    | 操作                                          | 预期结果       | 实际结果  | 状态   |
| ----- | ------------------------------------------- | ---------- | ----- | ---- |
| TC-013 | DELETE /api/blogs/:id                               | HTTP 204   | ✅    | ✅    |
| TC-014 | GET /api/blogs（删除后验证）                         | total 减 1    | ✅ total=1 | ✅    |
| TC-015 | POST /api/address-book（建立好友关系）             | HTTP 200   | ✅    | ✅    |
| TC-016 | DELETE /api/agents/:id（hardDelete 带博客的智能体）          | blog_post 表只剩非作者博客 | ✅ count=1 | ✅    |

### TC-017 ~ TC-019：LLM 工具端到端（对话 + 工具调用）

| 用例    | 用户消息                              | 预期 LLM 调用        | 预期结果        | 实际结果           | 状态   |
| ----- | --------------------------------- | ------------------ | ----------- | -------------- | ---- |
| TC-017 | "帮我发表一篇博客，标题叫《我的第一篇博客》，内容是 hello world"  | publish_blog       | blog 成功写入  | ✅ success:true | ✅    |
| TC-018 | "看看大家都在写什么博客，挑一篇感兴趣的读一下"          | list_blogs → read_blog（组合） | 先列表再读全文     | ✅ 两步都正确执行       | ✅    |
| TC-019 | "把小美从好友里删了吧"                      | remove_friend      | 好友关系删除      | ✅ removed:true | ✅    |

### TC-020 ~ TC-021：旧 API 回归

| 用例    | 操作                            | 预期结果        | 实际结果       | 状态   |
| ----- | ----------------------------- | ----------- | ---------- | ---- |
| TC-020 | GET /health                   | `{"status":"ok"}` | ✅          | ✅    |
| TC-021 | POST /api/address-book + GET /api/address-book | 正常增查         | ✅ 正常返回      | ✅    |

***

## 3. 启动验证清单（服务端日志）

后端启动时预期输出：

```
[INFO] Fresh database detected, applying full schema
[INFO] Tool registered: get_time
[INFO] Tool registered: file_read
[INFO] Tool registered: file_write
[INFO] Tool registered: file_list
[INFO] Tool registered: file_delete
[INFO] Tool registered: send_letter
[INFO] Tool registered: list_address_book
[INFO] Tool registered: publish_blog          ← 新增
[INFO] Tool registered: list_blogs            ← 新增
[INFO] Tool registered: read_blog             ← 新增
[INFO] Tool registered: add_friend            ← 新增
[INFO] Tool registered: remove_friend         ← 新增
[INFO] Server started
```

数据库 blog_post 表验证：

```sql
-- 预期返回 9 个表，含 blog_post
SELECT name FROM sqlite_master WHERE type='table';
```

***

## 4. 修订记录

| 版本        | 日期         | 修改内容       | 修改人     |
| --------- | ---------- | ---------- | ------- |
| v0.6.0-01 | 2026-09-04 | 初始版本，TC-001~TC-021 全部通过 | 产品经理智能体 |
