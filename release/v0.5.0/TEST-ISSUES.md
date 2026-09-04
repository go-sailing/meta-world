# ISSUES：MetaAgent v0.5.0 — 测试问题单

| 文档信息 | 内容 |
| ---- | ---- |
| 版本 | v0.5.0 |
| 日期 | 2026-09-04 |
| 状态 | ✅ 全部关闭 |
| 对应 PRD | v0.5.0 |
| 对应 SDD | v0.5.0 |

***

## 1. 问题汇总

| 问题单 | 标题 | 严重级别 | 状态 | 发现版本 | 修复版本 |
| ------ | ---- | -------- | ---- | -------- | -------- |
| ISSUE-001 | Typeface Token 只有注释无变量 | P2 Cosmetic | ✅ CLOSED | v0.5.0-dev | v0.5.0 |

***

## 2. 问题详情

### ISSUE-001：Typeface Token 缺失

| 项 | 值 |
| -- | -- |
| **标题** | `material-tokens.css` 中 Typeface Tokens 只有注释，无实际 CSS 变量定义 |
| **严重级别** | P2（影响视觉但不阻塞功能） |
| **状态** | ✅ CLOSED |
| **发现时间** | 2026-09-04 12:50 |
| **发现方式** | 浏览器自动化测试 TC-001：登录页标题 `--md-display-small` 计算值为 16px（元素默认值），而非预期的 36px |
| **根因** | 编写 `material-tokens.css` 时只写了注释标题（`/* Display */ /* Headline */`），漏掉了对应的 CSS 变量定义 |
| **影响范围** | 所有引用 `--md-display-small`、`--md-title-large` 等字体变量的组件，字体退化为浏览器默认值 |

**修复方案**：在 `material-tokens.css` 的 Typeface Tokens 区域补充完整变量定义：

```css
/* Display */
--md-display-large: 57px;
--md-display-medium: 45px;
--md-display-small: 36px;

/* Headline */
--md-headline-large: 32px;
--md-headline-medium: 28px;
--md-headline-small: 24px;

/* Title */
--md-title-large: 22px;
--md-title-medium: 16px;
--md-title-small: 14px;

/* Body */
--md-body-large: 16px;
--md-body-medium: 14px;
--md-body-small: 12px;

/* Label */
--md-label-large: 14px;
--md-label-medium: 12px;
--md-label-small: 11px;
```

**修复文件**：`web/src/styles/material-tokens.css`

**验证方式**：
- ✅ TC-001 回归：登录页标题 `--md-display-small` 计算值现在为 36px
- ✅ TC-020/021：AgentList 页面正常渲染
- ✅ TC-030：Chat 页顶部标题正常

***

## 3. 已知非问题（WARN 级别）

| 编号 | 现象 | 说明 |
| ---- | ---- | ---- |
| WARN-001 | `vue-tsc` 单独在 web 目录运行报 `@meta-world/shared` 找不到 | monorepo 结构下需先 `npm run build -w shared`，非本期问题 |
| WARN-002 | Vite build 输出 chunk size > 500kB 警告 | Element Plus 整体引入导致，非本期引入 |
| WARN-003 | server `tsc` 报 `getAuthUser` 未定义 | 后端原有 TS 类型配置问题，非本期（纯前端）引入 |

***

## 4. 修订记录

| 版本 | 日期 | 修改内容 |
| ---- | ---- | -------- |
| v0.5.0-01 | 2026-09-04 | 初始版本，ISSUE-001 已关闭 |
