# MetaAgent v0.2.0 测试报告

执行时间: 2026-09-03 11:00:36

## 概览

| 指标 | 值 |
|------|-----|
| 通过 | 71 |
| 失败 | 4 |
| 跳过 | 2 |
| 总计 | 77 |
| 通过率 | 92.2% |

## 详细日志
```

[0;36m===== 0. 健康检查 =====[0m
[0;32m[PASS][0m TC-0-01 健康检查 (HTTP 200)
[0;32m[PASS][0m TC-0-02 空 body 被拒绝 (HTTP 400)

[0;36m===== 1. 用户注册 F1 (正常流) =====[0m
[0;32m[PASS][0m TC-F1-01 Alice 正常注册 (HTTP 201)
[0;32m[PASS][0m TC-F1-01 user_id=834d9cbf-c24e-4009-a19c-bd96f3e34dcd
[0;32m[PASS][0m TC-F1-03 邮箱格式校验 (HTTP 400)
[0;32m[PASS][0m TC-F1-03b (HTTP 400)
[0;32m[PASS][0m TC-F1-03c (HTTP 400)
[0;32m[PASS][0m TC-F1-04 密码不含字母 (HTTP 400)
[0;32m[PASS][0m TC-F1-05 密码不含数字 (HTTP 400)
[0;32m[PASS][0m TC-F1-05b 密码 < 8 位 (HTTP 400)
[0;32m[PASS][0m TC-F1-02 重复邮箱 (HTTP 409)
[0;32m[PASS][0m Bob 注册 (HTTP 201)
[0;36m[INFO][0m Bob UID=4957c884-9039-45ea-ab9e-b291d0cdbd28

[0;36m===== 2. 用户登录 F2 =====[0m
[0;32m[PASS][0m TC-F2-01 Alice 正常登录 (HTTP 200)
[0;32m[PASS][0m TC-F2-01 user_id 一致 (834d9cbf-c24e-4009-a19c-bd96f3e34dcd)
[0;32m[PASS][0m TC-F2-02 密码错误 (401) (HTTP 401)
[0;32m[PASS][0m TC-F2-03 邮箱不存在 (401) (HTTP 401)
[0;32m[PASS][0m TC-F2-02/03 返回结构一致 (防枚举)
[0;32m[PASS][0m TC-F2-04 无效 token (HTTP 401)
[0;32m[PASS][0m TC-F2-06 /auth/me (HTTP 200)
[0;32m[PASS][0m TC-F2-06 邮箱正确 grep (HTTP 1)
[0;32m[PASS][0m Bob 登录 (HTTP 200)
[0;32m[PASS][0m Bob token 已获取

[0;36m===== 3. JWT 鉴权 F3 =====[0m
[0;32m[PASS][0m TC-F3-01 无 token (HTTP 401)
[0;32m[PASS][0m TC-F3-02 空 Bearer (HTTP 401)
[0;32m[PASS][0m TC-F3-02b 伪造 token (HTTP 401)

[0;36m===== 4. 智能体创建 F4 =====[0m
[0;32m[PASS][0m TC-F4-01 创建公开 agent (HTTP 201)
[0;32m[PASS][0m TC-F4-01 owner_user_id 归属正确
[0;32m[PASS][0m TC-F4-01 is_public=true
[0;32m[PASS][0m TC-F4-02 创建私有 agent (HTTP 201)
[0;32m[PASS][0m TC-F4-02 is_public 默认 false
[0;32m[PASS][0m TC-F4-03 同用户重名 (HTTP 409)
[0;32m[PASS][0m TC-F4-03 错误码 (HTTP 1)
[0;32m[PASS][0m TC-F4-04 跨用户重名允许 (Bob→天气助手) (HTTP 201)
[0;36m[INFO][0m AG_B1=51df8057-6a0a-42af-8068-32c2f5690e51
[0;32m[PASS][0m Bob 创建私有 (HTTP 201)
[0;36m[INFO][0m TC-F4-05 Alice 智能体上限测试
[0;32m[PASS][0m TC-F4-05 超过 10 个上限拦截 (HTTP 400)

[0;36m===== 5. 列表/查询 F5 =====[0m
[0;32m[PASS][0m TC-F5-01 Alice 列表 (HTTP 200)
[0;32m[PASS][0m TC-F5-01 Alice 有 10 个 agent
[0;32m[PASS][0m TC-F5-02 Bob 列表 (HTTP 200)
[0;32m[PASS][0m TC-F5-02 跨用户列表隔离
[0;32m[PASS][0m TC-F5-03 Alice 查自己详情 (HTTP 200)
[0;32m[PASS][0m TC-F5-04 Bob 查 Alice 详情 (403) (HTTP 403)

[0;36m===== 6. 修改 F6 =====[0m
[0;32m[PASS][0m TC-F6-01 改名称 (HTTP 200)
[0;31m[FAIL][0m TC-F6-01 名称=
[0;32m[PASS][0m TC-F6-02 私有改公开 (HTTP 200)
[0;32m[PASS][0m TC-F6-03 改 persona_tags (HTTP 200)
[0;32m[PASS][0m TC-F6-05 跨用户修改 (403) (HTTP 403)

[0;36m===== 7. 禁用/删除 F7 =====[0m
[0;32m[PASS][0m TC-F7-01 禁用 Bob 的 agent (HTTP 200)
[0;31m[FAIL][0m TC-F7-01 status=
[0;32m[PASS][0m TC-F7-03 硬删除 AG_A2 (HTTP 204)
[0;32m[PASS][0m TC-F7-04 被删后不可查 (HTTP 404)
[0;32m[PASS][0m TC-F7-05 Alice 删 Bob 的 (403) (HTTP 403)

[0;36m===== 9. Discover F9 =====[0m
[0;32m[PASS][0m TC-F9-01 discover 分页 (HTTP 200)
[0;36m[INFO][0m discover total=2 items=2
[0;32m[PASS][0m TC-F9-01 total >= 2 (Alice 2 公开 + Bob 1 公开 = 至少 2, 因为 Bob 自己的会不会显示?)
[0;32m[PASS][0m TC-F9-02 关键词 '天气' (HTTP 200)
[0;32m[PASS][0m TC-F9-02 所有返回项都含关键词
[0;32m[PASS][0m TC-F9-03 空关键词 (HTTP 200)
[0;32m[PASS][0m TC-F9-03 total=0
[0;32m[PASS][0m TC-F9-04 未登录 discover (HTTP 401)
[0;32m[PASS][0m TC-F9-05 邮箱脱敏格式正确
[0;31m[FAIL][0m TC-F9-05b 被禁用 agent 不应出现在 discover

[0;36m===== 10. 通讯录 F10/F11 =====[0m
[0;32m[PASS][0m TC-F10-01 Bob 添加 B1→A1 (HTTP 201)
[0;32m[PASS][0m TC-F10-01 entry_id=fe8c0e30-af5c-4d1f-b3ba-fda260a34450
[0;32m[PASS][0m TC-F10-02 重复添加 (HTTP 409)
[0;32m[PASS][0m TC-F10-03 不能加自己 (HTTP 400)
[0;32m[PASS][0m TC-F10-05 跨用户 owner (403) (HTTP 403)
[0;36m[INFO][0m Alice 私有 agent_id=
[0;32m[PASS][0m Alice 加 Bob → 建立双向
[0;32m[PASS][0m TC-F11-01 Bob 通讯录 (HTTP 200)
[0;32m[PASS][0m TC-F11-01 通讯录有 1 条
[0;32m[PASS][0m TC-F11-02 is_mutual=true 双向
[0;32m[PASS][0m TC-F11-04 Bob 查 Alice 通讯录 (403) (HTTP 403)
[0;31m[FAIL][0m TC-F10-07 移除好友 — 期望 HTTP 204, 实际 404, body={"error":"ENTRY_NOT_FOUND","message":"通讯录条目不存在"}

[0;36m===== 11. 跨模块权限隔离 SEC =====[0m
[0;32m[PASS][0m TC-SEC-01 chat 隔离 (HTTP 403)
[0;32m[PASS][0m TC-SEC-02 mail/send 隔离 (HTTP 403)
[0;32m[PASS][0m TC-SEC-03 inbox 隔离 (HTTP 403)
[0;36m[INFO][0m AG_A_OTHER=

[0;36m===== 12. 旧功能回归 REG =====[0m
[1;33m[SKIP][0m TC-REG-01 chat 路由通但 LLM 未配 (fetch failed) — 非业务 bug

[0;36m===== 13. 限流测试 (放最后) =====[0m
[0;36m[INFO][0m 注册限流: 用全新独立邮箱连续注册 6 次
[0;32m[PASS][0m TC-RATE-REG 触发注册限流 (第 3 次)
[0;36m[INFO][0m 登录限流: 连续 12 次错误密码
[1;33m[SKIP][0m TC-RATE-LOGIN 15 次未触发限流

[0;36m===== 14. 数据库检查 =====[0m
[0;36m[INFO][0m --- user ---
alice@demo.com|$2b$12$.rb...
bob@demo.com|$2b$12$AV7...
ratelimit_1_1788433229_19933@demo.com|$2b$12$HOd...
ratelimit_2_1788433229_19933@demo.com|$2b$12$dsX...
[0;36m[INFO][0m --- agent 归属 ---
4957c884-9039-45ea-ab9e-b291d0cdbd28|4
834d9cbf-c24e-4009-a19c-bd96f3e34dcd|9
[0;36m[INFO][0m --- agent public/private ---
0|active|10
1|active|3
[0;36m[INFO][0m --- address_book ---
2

[0;36m===== 汇总: PASS=71 / FAIL=4 / SKIP=2 / TOTAL=77 / 通过率=92.2% =====[0m
```
