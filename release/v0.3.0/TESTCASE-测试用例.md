# TESTCASE：MetaAgent v0.3.0 — 测试用例

| 文档信息 | 内容       |
| ---- | -------- |
| 版本   | v0.3.0   |
| 日期   | 2026-09-04 |
| 前置版本 | v0.2.0   |
| 测试范围 | 记忆查看 / 信件处理日志 / 已发送信件 |

***

## 1. 测试环境

| 项   | 值                           |
| --- | --------------------------- |
| Base URL | `http://localhost:3000`     |
| 前置条件 | v0.2.0 测试已跑通，服务正常启动，DB 已迁移至 v0.3.0 |
| 测试类型 | API 集成测试 + 前端手动冒烟           |

***

## 2. 测试用例清单

### 2.1 记忆查看 API（F1）

| TC ID | 功能         | 前置条件                 | 操作                                                     | 期望结果                                          | 类型   |
| ----- | ---------- | -------------------- | ------------------------------------------------------ | --------------------------------------------- | ---- |
| TC-MEM-01 | 记忆列表正常查询    | 登录用户 + 有记忆的 agent            | `GET /api/memory/list?agent_id={own}`                  | HTTP 200, 返回 `{total, items: []}`                | 功能   |
| TC-MEM-02 | 记忆列表无 token  | 无 token               | `GET /api/memory/list?agent_id={any}`                  | HTTP 401                                      | 鉴权   |
| TC-MEM-03 | 记忆列表越权查询    | Bob token + Alice 的 agent | `GET /api/memory/list?agent_id={alice_agent}`           | HTTP 403                                      | 归属隔离 |
| TC-MEM-04 | 缺少 agent\_id | —                    | `GET /api/memory/list`                                 | HTTP 400 `agent_id required`                  | 参数校验 |
| TC-MEM-05 | 按 layer 筛选   | self/world/other 记忆都存在 | `GET /api/memory/list?agent_id=X&layer=self`           | 只返回 layer=self 的记忆                           | 功能   |
| TC-MEM-06 | 按 source 筛选  | 三种 source 记忆都存在      | `GET /api/memory/list?agent_id=X&source=dialogue`      | 只返回 source_type=dialogue 的记忆                | 功能   |
| TC-MEM-07 | 排序切换       | 有多条记忆                | `GET /api/memory/list?agent_id=X&sort=time_desc`       | 按 created\_at 倒序                                 | 功能   |
| TC-MEM-08 | 分页       | 超过 20 条记忆             | `GET /api/memory/list?agent_id=X&page=2&size=5`        | 返回第 2 页 5 条                                     | 功能   |
| TC-MEM-09 | 空状态       | 新创建的空 agent            | `GET /api/memory/list?agent_id=new_agent`              | total=0, items=[]                             | 功能   |
| TC-MEM-10 | target\_agent\_name 关联 | other 层记忆存在          | 查看 items 中的 target\_agent\_name                     | 非空时正确关联到目标智能体名称                              | 功能   |

### 2.2 信件处理日志 API（F2）

| TC ID | 功能         | 前置条件                  | 操作                                                     | 期望结果                                              | 类型   |
| ----- | ---------- | --------------------- | ------------------------------------------------------ | ------------------------------------------------- | ---- |
| TC-LOG-01 | 处理日志正常查询   | 有被处理过的信件（含日志）         | `GET /api/mail/{letter_id}/logs`                       | HTTP 200, `{letter, logs: []}` 含至少 5 条日志              | 功能   |
| TC-LOG-02 | 处理日志无 token | 无 token                | `GET /api/mail/{any_id}/logs`                          | HTTP 401                                          | 鉴权   |
| TC-LOG-03 | 归属隔离（发件方）  | Alice 发信给 Bob           | Alice 查信的日志                                             | 成功（发件方归自己）                                        | 归属隔离 |
| TC-LOG-04 | 归属隔离（收件方）  | Alice 发信给 Bob           | Bob 查信的日志                                              | 成功（收件方归自己）                                        | 归属隔离 |
| TC-LOG-05 | 归属隔离（非相关方） | Alice 发信给 Bob，第三方 Charlie | Charlie 查信的日志                                          | 返回 null 或 HTTP 404/403                            | 归属隔离 |
| TC-LOG-06 | 不存在的信件    | —                     | `GET /api/mail/nonexistent/logs`                        | HTTP 404 `LETTER_NOT_FOUND`                       | 参数校验 |
| TC-LOG-07 | reprocess 清空旧日志 | 有已处理日志的信件             | 调 reprocess → 立即查 logs                                       | 旧日志被清空（只剩 processing\_error 或空），等待重新处理          | 功能   |
| TC-LOG-08 | 日志顺序       | 完整处理的信件               | 检查 logs 的 seq                                      | seq 从 1 开始递增，按处理顺序排列                                | 功能   |
| TC-LOG-09 | 处理失败日志     | 触发处理错误（如 LLM 超时）       | 查 logs                                                 | 包含 `processing_error` 事件且 detail.message 非空 | 异常处理 |

### 2.3 已发送信件 API（F3）

| TC ID | 功能         | 前置条件           | 操作                                         | 期望结果                                               | 类型   |
| ----- | ---------- | -------------- | ------------------------------------------ | -------------------------------------------------- | ---- |
| TC-SENT-01 | 已发送正常查询    | 有发送过信件的 agent    | `GET /api/mail/sent?agent_id={own}`        | HTTP 200, 返回 SentLetterListItem 数组                | 功能   |
| TC-SENT-02 | 已发送无 token  | 无 token         | `GET /api/mail/sent?agent_id={any}`        | HTTP 401                                           | 鉴权   |
| TC-SENT-03 | 已发送越权查询    | Bob token + Alice agent | `GET /api/mail/sent?agent_id={alice}`      | HTTP 403                                           | 归属隔离 |
| TC-SENT-04 | 缺少 agent\_id | —                | `GET /api/mail/sent`                       | HTTP 400 `agent_id required`                       | 参数校验 |
| TC-SENT-05 | has\_reply 判断 | 目标智能体回复过         | 查看 has\_reply 字段                              | 回复过的信件 has\_reply=true，reply\_preview 非空                | 功能   |
| TC-SENT-06 | 空状态       | 未发送过任何信件的 agent | `GET /api/mail/sent?agent_id=new`          | 返回空数组                                              | 功能   |
| TC-SENT-07 | 时间排序       | 有多封已发送信件        | 检查 sent\_at 顺序                                   | 按 sent\_at 倒序                                        | 功能   |
| TC-SENT-08 | 收件方名称展示    | 目标 agent 存在     | 检查 to\_name                                    | 正确关联到目标智能体名称                                       | 功能   |

### 2.4 前端冒烟测试

| TC ID | 功能       | 前置条件          | 操作                                    | 期望结果                         |
| ----- | -------- | ------------- | ------------------------------------- | ---------------------------- |
| TC-FE-01 | MemoryView 页面加载 | 登录 + 有记忆的 agent | 浏览器打开 `/memory/:agentId`         | 页面正常渲染，无 JS 报错                 |
| TC-FE-02 | MemoryView 筛选切换 | 页面已加载         | 切换 layer / source / sort                | 列表实时刷新                      |
| TC-FE-03 | Mailbox Tab 切换  | 登录 + 有收发信件     | 切换"收件箱"/"已发送" Tab                     | 两个 Tab 数据正确                    |
| TC-FE-04 | 处理日志抽屉   | 有被处理过的信件      | 点击"查看处理日志"按钮                        | 时间线组件正确渲染每个事件                |
| TC-FE-05 | 空状态引导     | 新 agent 无记忆无信件  | 打开记忆页 / 已发送 Tab                      | 显示友好空状态 + 引导按钮                |
| TC-FE-06 | 归属隔离 UI   | 多用户场景         | Bob 打开 MemoryView?agentId=Alice  | 403 错误或重定向（前端防护可能不覆盖后端校验） |

***

## 3. 自动化测试脚本

见 `/workspace/scripts/run-test-v03.sh`（待 Step 5 执行）。

***

## 4. 数据准备

### 4.1 前置：v0.2.0 测试已执行并产生的典型数据

- Alice 有多个 agent，其中 AG_A1 与 AG_B1 互相加了通讯录好友
- Bob 给 Alice 发过信件，Alice 的 AG_A1 有收到信的记忆
- Alice 与自己的另一个 agent AG_A_OTHER 互发过信

### 4.2 v0.3.0 场景数据补充

| 步骤 | 操作                                                    | 目的                                    |
| -- | ----------------------------------------------------- | ------------------------------------- |
| 1  | Alice 通过 AG_A1 给 AG_A_OTHER 发一封带问号的信                            | 触发自动回复 → 产生完整日志链                            |
| 2  | 通过对话功能与 AG_A1 对话，让它产生 dialogue 类型记忆                        | 覆盖 memory 的 source 筛选                      |
| 3  | 查询 memory list 确认 self/world/other 各层都有数据                     | 覆盖 layer 筛选                              |

***

## 5. 执行计划

| 步骤 | 内容                   | 时间     |
| -- | -------------------- | ------ |
| 1  | 清库 → 跑 v0.2.0 脚本建立基线数据 | 5 分钟   |
| 2  | 服务热启动触发 migration 003      | 1 分钟   |
| 3  | 补充场景数据               | 3 分钟   |
| 4  | 跑 v0.3.0 专项脚本           | 5 分钟   |
| 5  | 前端手动冒烟               | 10 分钟  |
| 6  | 汇总问题 → 记录 TEST-ISSUES       | 2 分钟   |

预计总计：~26 分钟
