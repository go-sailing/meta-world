# SDD：MetaAgent v0.5.0 — 软件设计文档

| 文档信息   | 内容                                                                     |
| ------ | ---------------------------------------------------------------------- |
| 版本     | v0.5.0                                                                 |
| 日期     | 2026-09-04                                                             |
| 状态     | 草稿                                                                     |
| 对应 PRD | [PRD-v0.5.0-Material-Design-UI.md](./PRD-v0.5.0-Material-Design-UI.md) |
| 前置 SDD | v0.4.0                                                                 |

> **v0.4.0 → v0.5.0 变更说明**：本期为纯前端 UI 升级，后端零改动。核心工作是引入全局 MD Design Token、覆盖 Element Plus 主题变量、重构智能体卡片和聊天页。预计前端代码改动约 1200 行（新增 800 行 MD 主题 CSS，重构 400 行 Vue 模板）。

***

## 1. 技术栈变更

### 1.1 无新增 npm 包

v0.5.0 **不引入任何新依赖**。Material Design 风格完全通过以下方式实现：

| 方式                | 说明                                                    |
| ----------------- | ----------------------------------------------------- |
| CSS 变量覆盖          | 在 `:root` 中定义 MD3 Token，覆盖 Element Plus 的 `--el-*` 变量 |
| Element Plus 主题变量 | EP 使用 CSS 变量，只需覆盖 `--el-color-primary` 等即可改主色         |
| 自定义组件样式           | 对 EP 不支持的 MD 特性（如 shape、elevation）编写自定义 CSS           |

### 1.2 文件组织

```
web/src/
├── styles/                          ← 新增目录
│   ├── material-tokens.css          ← MD3 Design Token 定义
│   ├── element-overrides.css        ← 覆盖 Element Plus 变量
│   └── global.css                   ← 全局重置 + 工具类
│
├── main.ts                           ← 改造：引入样式文件
├── views/
│   ├── AgentList.vue                ← 重构：卡片精简 + 整卡点击
│   ├── Chat.vue                     ← 重构：App Bar + 功能入口 + MD 气泡
│   ├── LoginView.vue                ← 改造：MD Card 风格
│   ├── RegisterView.vue             ← 改造：MD Card 风格
│   ├── Discover.vue                 ← 适配：MD 卡片样式
│   ├── CreateAgent.vue              ← 适配：MD 表单风格
│   ├── Mailbox.vue                  ← 适配：MD 列表风格
│   ├── MemoryView.vue               ← 适配：MD 卡片风格
│   ├── AddressBook.vue              ← 适配：MD 卡片风格
│
├── components/
│   ├── AppLayout.vue                ← 重构：MD Top App Bar
│   ├── ToolCallCard.vue             ← 改造：MD 风格卡片
│
├── App.vue                          ← 改造：全局背景色 + 字体
```

***

## 2. MD3 Design Token 定义

### 2.1 material-tokens.css

```css
/* web/src/styles/material-tokens.css */

:root {
  /* ========== 颜色系统 (Color Tokens) ========== */
  
  /* Primary - 紫色调 */
  --md-primary: #6750A4;
  --md-on-primary: #FFFFFF;
  --md-primary-container: #EADDFF;
  --md-on-primary-container: #21005D;
  
  /* Secondary - 灰紫色调 */
  --md-secondary: #625B71;
  --md-on-secondary: #FFFFFF;
  --md-secondary-container: #E8DEF8;
  --md-on-secondary-container: #1D192B;
  
  /* Tertiary - 粉紫色调 */
  --md-tertiary: #7D5260;
  --md-on-tertiary: #FFFFFF;
  --md-tertiary-container: #FFD8E4;
  --md-on-tertiary-container: #31111D;
  
  /* Error */
  --md-error: #B3261E;
  --md-on-error: #FFFFFF;
  --md-error-container: #F9DEDC;
  --md-on-error-container: #410E0B;
  
  /* Success */
  --md-success: #386A20;
  --md-on-success: #FFFFFF;
  --md-success-container: #B7F494;
  --md-on-success-container: #052100;
  
  /* Warning */
  --md-warning: #B36500;
  --md-on-warning: #FFFFFF;
  --md-warning-container: #FFDDB5;
  --md-on-warning-container: #2A1800;
  
  /* Surface - 表面色系统 */
  --md-surface: #FEF7FF;
  --md-surface-dim: #DED8E1;
  --md-surface-bright: #FEF7FF;
  --md-surface-container-lowest: #FFFFFF;
  --md-surface-container-low: #F7F2FA;
  --md-surface-container: #F3EDF7;
  --md-surface-container-high: #ECE6F0;
  --md-surface-container-highest: #E6E0E9;
  
  /* Surface 上的文字 */
  --md-on-surface: #1D1B20;
  --md-on-surface-variant: #49454F;
  
  /* Outline */
  --md-outline: #79747E;
  --md-outline-variant: #CAC4D0;
  
  /* ========== 形状系统 (Shape Tokens) ========== */
  
  --md-shape-none: 0;
  --md-shape-xs: 4px;
  --md-shape-sm: 8px;
  --md-shape-md: 12px;
  --md-shape-lg: 16px;
  --md-shape-xl: 28px;
  --md-shape-full: 9999px;
  
  /* ========== 阴影系统 (Elevation Tokens) ========== */
  
  --md-elevation-0: none;
  --md-elevation-1: 0 1px 2px 0 rgba(0,0,0,0.30), 0 1px 3px 1px rgba(0,0,0,0.15);
  --md-elevation-2: 0 1px 2px 0 rgba(0,0,0,0.30), 0 2px 6px 2px rgba(0,0,0,0.15);
  --md-elevation-3: 0 1px 3px 0 rgba(0,0,0,0.30), 0 4px 8px 3px rgba(0,0,0,0.15);
  --md-elevation-4: 0 2px 3px 0 rgba(0,0,0,0.30), 0 6px 10px 4px rgba(0,0,0,0.15);
  
  /* ========== 字体系统 (Typeface Tokens) ========== */
  
  --md-font-family: 'Roboto', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --md-font-mono: 'Roboto Mono', 'JetBrains Mono', 'Courier New', monospace;
  
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
  
  /* ========== 间距系统 (Spacing Tokens) ========== */
  
  --md-space-1: 4px;
  --md-space-2: 8px;
  --md-space-3: 12px;
  --md-space-4: 16px;
  --md-space-5: 20px;
  --md-space-6: 24px;
  --md-space-8: 32px;
  --md-space-10: 40px;
  --md-space-12: 48px;
}
```

### 2.2 element-overrides.css

覆盖 Element Plus 主题变量，使其匹配 MD3 配色：

```css
/* web/src/styles/element-overrides.css */

:root {
  /* Element Plus 主色 → MD Primary */
  --el-color-primary: var(--md-primary);
  --el-color-primary-light-3: #8B7BCF;
  --el-color-primary-light-5: #B6A9DE;
  --el-color-primary-light-7: #D4C9E8;
  --el-color-primary-light-8: #E2DAEE;
  --el-color-primary-light-9: var(--md-primary-container);
  --el-color-primary-dark-2: #4E388F;
  
  /* Element Plus 功能色 → MD 语义色 */
  --el-color-success: var(--md-success);
  --el-color-warning: var(--md-warning);
  --el-color-danger: var(--md-error);
  --el-color-error: var(--md-error);
  --el-color-info: var(--md-secondary);
  
  /* Element Plus 中性色 */
  --el-color-text-primary: var(--md-on-surface);
  --el-color-text-regular: var(--md-on-surface-variant);
  --el-color-text-secondary: var(--md-on-surface-variant);
  --el-color-text-placeholder: var(--md-outline);
  
  /* Element Plus 边框 */
  --el-border-color: var(--md-outline-variant);
  --el-border-color-light: var(--md-outline-variant);
  --el-border-color-lighter: #F1EFEF;
  --el-border-radius-base: var(--md-shape-sm);
  
  /* Element Plus 背景 */
  --el-bg-color: var(--md-surface);
  --el-bg-color-page: var(--md-surface);
  --el-fill-color-blank: transparent;
}
```

### 2.3 global.css

全局重置 + 工具类：

```css
/* web/src/styles/global.css */

/* ========== 全局重置 ========== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-family: var(--md-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  background: var(--md-surface);
  color: var(--md-on-surface);
  font-size: var(--md-body-medium);
  line-height: 1.5;
}

a {
  color: var(--md-primary);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* ========== MD Elevation 工具类 ========== */
.md-elevation-1 { box-shadow: var(--md-elevation-1); }
.md-elevation-2 { box-shadow: var(--md-elevation-2); }
.md-elevation-3 { box-shadow: var(--md-elevation-3); }

/* ========== MD Shape 工具类 ========== */
.md-shape-none { border-radius: var(--md-shape-none); }
.md-shape-xs { border-radius: var(--md-shape-xs); }
.md-shape-sm { border-radius: var(--md-shape-sm); }
.md-shape-md { border-radius: var(--md-shape-md); }
.md-shape-lg { border-radius: var(--md-shape-lg); }
.md-shape-xl { border-radius: var(--md-shape-xl); }
.md-shape-full { border-radius: var(--md-shape-full); }

/* ========== MD Surface 工具类 ========== */
.md-surface { background: var(--md-surface); }
.md-surface-container { background: var(--md-surface-container); }
.md-surface-container-high { background: var(--md-surface-container-high); }
.md-surface-container-highest { background: var(--md-surface-container-highest); }
.md-primary-container { background: var(--md-primary-container); }

/* ========== Element Plus 全局覆盖 ========== */

/* el-button MD 化 */
.el-button {
  font-family: var(--md-font-family);
  border-radius: var(--md-shape-full);
  padding: 8px 20px;
  font-weight: 500;
  letter-spacing: 0.1px;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}
.el-button--primary {
  background: var(--md-primary);
  border-color: var(--md-primary);
  color: var(--md-on-primary);
  box-shadow: var(--md-elevation-0);
}
.el-button--primary:hover {
  background: #5D469A;
  border-color: #5D469A;
  box-shadow: var(--md-elevation-1);
}

/* el-card MD 化 */
.el-card {
  border-radius: var(--md-shape-lg);
  border: none;
  box-shadow: var(--md-elevation-1);
  background: var(--md-surface-container-low);
  transition: box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1);
}

/* el-input MD 化 */
.el-input__wrapper {
  border-radius: var(--md-shape-xs) var(--md-shape-xs) 0 0 !important;
  box-shadow: 0 1px 0 var(--md-outline) inset !important;
  background: var(--md-surface-container-high) !important;
  transition: all 0.2s;
}
.el-input__wrapper.is-focus {
  box-shadow: 0 2px 0 var(--md-primary) inset !important;
}

/* el-tag MD 化 */
.el-tag {
  border-radius: var(--md-shape-sm);
  font-weight: 500;
}

/* el-dialog MD 化 */
.el-dialog {
  border-radius: var(--md-shape-xl);
  box-shadow: var(--md-elevation-3);
}
.el-dialog__header {
  padding: 24px 24px 16px;
}
.el-dialog__body {
  padding: 8px 24px 24px;
}
.el-dialog__footer {
  padding: 16px 24px 24px;
}

/* el-dropdown-menu MD 化 */
.el-dropdown-menu {
  border-radius: var(--md-shape-md);
  box-shadow: var(--md-elevation-2);
  border: none;
  padding: 8px;
}
.el-dropdown-menu__item {
  border-radius: var(--md-shape-sm);
  padding: 10px 16px;
}
.el-dropdown-menu__item:hover {
  background: var(--md-surface-container-high);
}

/* el-empty 颜色适配 */
.el-empty__description p {
  color: var(--md-on-surface-variant);
}

/* el-badge MD 化 */
.el-badge__content {
  background: var(--md-error);
  font-size: 11px;
  border: none;
  box-shadow: none;
}

/* el-breadcrumb / el-tabs */
.el-tabs__item.is-active {
  color: var(--md-primary);
}
.el-tabs__active-bar {
  background: var(--md-primary);
}
```

***

## 3. 智能体卡片重构设计

### 3.1 AgentList.vue 模板结构

```vue
<!-- web/src/views/AgentList.vue -->

<template>
  <div class="agent-list-page">
    <!-- 空状态 -->
    <el-empty v-if="!loading && agents.length === 0" 
              description="还没有智能体，去创建第一个吧～" />

    <!-- 卡片网格 -->
    <div v-else class="agent-grid">
      <div 
        v-for="agent in agents" 
        :key="agent.agent_id"
        class="agent-card"
        :class="{ disabled: agent.status === 'disabled' }"
        @click="handleCardClick(agent)"
        tabindex="0"
        role="button"
        :aria-label="`进入 ${agent.name} 的聊天`"
      >
        <!-- 卡片内容 -->
        <div class="card-content">
          <!-- 顶部：头像 + 名称 + 状态 -->
          <div class="card-header">
            <el-avatar :size="56" class="agent-avatar">
              {{ agent.name.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="agent-info">
              <h3 class="agent-name">{{ agent.name }}</h3>
              <div class="agent-meta">
                <el-tag v-if="agent.is_public" size="small" class="md-chip">公开</el-tag>
                <el-tag v-else size="small" class="md-chip private">私有</el-tag>
                <el-tag v-if="agent.status === 'disabled'" size="small" type="danger" class="md-chip">已禁用</el-tag>
              </div>
            </div>
            <!-- 未读邮件徽章（独立点击区） -->
            <el-badge 
              v-if="agent.unread_count" 
              :value="agent.unread_count"
              class="mail-badge"
              @click.stop="goMailbox(agent.agent_id)"
            >
              <el-icon class="mail-icon"><Message /></el-icon>
            </el-badge>
          </div>

          <!-- 中部：标签 chips -->
          <div class="agent-tags">
            <span 
              v-for="tag in agent.persona_tags" 
              :key="tag" 
              class="md-filter-chip"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- 底部 MD Ripple 效果层 -->
        <div class="card-ripple"></div>
      </div>
    </div>
  </div>
</template>
```

### 3.2 卡片样式（MD 3 Card）

```css
/* Agent Card - MD3 Filled Card */
.agent-card {
  position: relative;
  background: var(--md-surface-container-low);
  border-radius: var(--md-shape-lg);
  box-shadow: var(--md-elevation-1);
  padding: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: 
    box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
    transform 0.2s cubic-bezier(0.2, 0, 0, 1);
  min-height: 160px;
  display: flex;
  flex-direction: column;
}

.agent-card:hover {
  box-shadow: var(--md-elevation-2);
  transform: translateY(-2px);
}

.agent-card:active {
  transform: translateY(0) scale(0.99);
}

.agent-card:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

.agent-card.disabled {
  cursor: not-allowed;
  opacity: 0.5;
  pointer-events: none;
}

.card-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Header 布局 */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.agent-avatar {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 500;
  flex-shrink: 0;
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-family: var(--md-font-family);
  font-size: var(--md-title-large);
  font-weight: 500;
  color: var(--md-on-surface);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* MD Filter Chip 替代 el-tag */
.md-chip {
  border-radius: var(--md-shape-full) !important;
  font-weight: 500;
  font-size: 11px;
  padding: 4px 10px !important;
  height: auto !important;
}

/* Persona Tags as MD Filter Chips */
.agent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.md-filter-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 14px;
  border-radius: var(--md-shape-full);
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-size: var(--md-label-medium);
  font-weight: 500;
  border: 1px solid var(--md-outline-variant);
  cursor: pointer;
  transition: all 0.15s;
}

.md-filter-chip:hover {
  background: var(--md-surface-container-high);
}

/* 未读邮件徽章 */
.mail-badge {
  margin-left: auto;
  flex-shrink: 0;
}

.mail-badge :deep(.el-badge__content) {
  background: var(--md-error);
  border: none;
  font-size: 11px;
}

.mail-icon {
  font-size: 20px;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--md-shape-full);
  transition: background 0.15s;
}

.mail-icon:hover {
  background: var(--md-surface-container-high);
  color: var(--md-primary);
}

/* Ripple 效果层 */
.card-ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), 
              rgba(103, 80, 164, 0.12) 0%, 
              transparent 50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.agent-card:hover .card-ripple {
  opacity: 1;
}
```

### 3.3 卡片网格布局

```css
.agent-list-page {
  padding: 32px;
  max-width: 1280px;
  margin: 0 auto;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
```

***

## 4. 聊天页重构设计

### 4.1 Chat.vue 布局结构

```vue
<!-- web/src/views/Chat.vue -->

<template>
  <div class="chat-page">
    <!-- ========== MD Top App Bar ========== -->
    <header class="chat-app-bar">
      <!-- 左侧：返回按钮 + 智能体信息 -->
      <div class="app-bar-leading">
        <button class="md-icon-btn" @click="$router.push('/agents')" aria-label="返回">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="agent-info">
          <el-avatar :size="40" class="agent-avatar">
            {{ agent?.name?.charAt(0).toUpperCase() || 'A' }}
          </el-avatar>
          <div class="agent-text">
            <div class="agent-name">{{ agent?.name || '智能体' }}</div>
            <div class="agent-chips">
              <span 
                v-for="tag in agent?.persona_tags?.slice(0, 3)" 
                :key="tag" 
                class="md-filter-chip small"
              >{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：功能入口 Icon Buttons -->
      <div class="app-bar-trailing">
        <button 
          class="md-icon-btn" 
          @click="$router.push(`/mailbox/${agentId}`)"
          aria-label="邮件"
        >
          <el-icon><Message /></el-icon>
          <span v-if="agent?.unread_count" class="icon-badge">
            {{ agent.unread_count > 99 ? '99+' : agent.unread_count }}
          </span>
        </button>

        <button 
          class="md-icon-btn" 
          @click="$router.push(`/memory/${agentId}`)"
          aria-label="记忆"
        >
          <el-icon><Cpu /></el-icon>
        </button>

        <button 
          class="md-icon-btn" 
          @click="$router.push(`/address-book/${agentId}`)"
          aria-label="通讯录"
        >
          <el-icon><AddressBook /></el-icon>
        </button>

        <button 
          class="md-icon-btn" 
          @click="onSettingsClick"
          aria-label="设置"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </div>
    </header>

    <!-- ========== 消息区 ========== -->
    <div ref="scrollRef" class="message-list">
      <el-empty v-if="chat.messages.length === 0" 
                description="和智能体聊点什么..." 
                :image-size="80" />
      
      <div 
        v-for="(msg, i) in chat.messages" 
        :key="i" 
        class="msg-row" 
        :class="msg.role"
      >
        <!-- Assistant 头像 -->
        <el-avatar 
          v-if="msg.role === 'assistant'" 
          :size="32" 
          class="msg-avatar assistant"
        >
          {{ agent?.name?.charAt(0).toUpperCase() || 'A' }}
        </el-avatar>

        <div class="msg-content">
          <!-- 工具调用卡片 -->
          <ToolCallCard 
            v-for="(step, si) in (msg.toolSteps || [])" 
            :key="'tc-' + si"
            :tool-name="step.toolName" 
            :args="step.args"
            :result="step.result" 
            :success="(step.result as any)?.success" 
          />

          <!-- 消息气泡 -->
          <div v-if="msg.content" class="bubble">
            {{ msg.content }}
          </div>
          <!-- 加载指示器 -->
          <div v-else-if="msg.role === 'assistant' && !msg.content && !msg.toolSteps?.length" 
               class="bubble loading">
            <span class="dots">
              <span></span><span></span><span></span>
            </span>
          </div>
        </div>

        <!-- User 头像 -->
        <el-avatar 
          v-if="msg.role === 'user'" 
          :size="32" 
          class="msg-avatar user"
          style="background: var(--md-primary)"
        >
          {{ authStore.email?.charAt(0).toUpperCase() || 'U' }}
        </el-avatar>
      </div>
    </div>

    <!-- ========== 输入区 ========== -->
    <div class="input-area">
      <div class="input-wrapper">
        <el-input
          v-model="inputMsg"
          type="textarea"
          :rows="1"
          autosize
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="和智能体聊点什么... (Ctrl+Enter 发送)"
          @keydown.enter.ctrl="send"
          :disabled="chat.isStreaming"
          resize="none"
        />
        <button 
          class="md-icon-btn send-btn"
          :disabled="!inputMsg.trim() || chat.isStreaming"
          @click="send"
          aria-label="发送"
        >
          <el-icon><Promotion /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>
```

### 4.2 MD Icon Button 样式

```css
/* MD Icon Button - 圆形点击热区 */
.md-icon-btn {
  position: relative;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border: none;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s cubic-bezier(0.2, 0, 0, 1),
              color 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.md-icon-btn:hover {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
}

.md-icon-btn:active {
  background: var(--md-surface-container-highest);
}

.md-icon-btn:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

.md-icon-btn .el-icon {
  font-size: 22px;
}

/* 图标角标 */
.icon-badge {
  position: absolute;
  top: 8px;
  right: 12px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--md-error);
  color: var(--md-on-error);
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--md-shape-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 2px solid var(--md-surface);
}
```

### 4.3 Top App Bar 样式

```css
/* MD3 Top App Bar */
.chat-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 16px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.app-bar-leading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-info .agent-avatar {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 500;
}

.agent-text {
  display: flex;
  flex-direction: column;
}

.agent-text .agent-name {
  font-size: var(--md-title-medium);
  font-weight: 500;
  color: var(--md-on-surface);
  line-height: 1.4;
}

.agent-chips {
  display: flex;
  gap: 4px;
}

.md-filter-chip.small {
  height: 20px;
  padding: 0 10px;
  font-size: 10px;
  background: transparent;
  border-color: var(--md-outline-variant);
}

.app-bar-trailing {
  display: flex;
  align-items: center;
  gap: 0;
}
```

### 4.4 消息气泡 MD 样式

```css
/* ========== Chat Page Layout ========== */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--md-surface);
}

/* ========== Message List ========== */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  background: var(--md-surface);
  scroll-behavior: smooth;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 100%;
}

.msg-row.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
}

.msg-avatar.assistant {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.msg-content {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-row.user .msg-content {
  align-items: flex-end;
}

.msg-row.assistant .msg-content {
  align-items: flex-start;
}

/* MD Bubble */
.bubble {
  padding: 12px 16px;
  border-radius: var(--md-shape-lg);
  font-size: var(--md-body-medium);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

/* User Bubble - MD Primary Container */
.msg-row.user .bubble {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  border-bottom-right-radius: 4px;
}

/* Assistant Bubble - MD Surface Variant with elevation */
.msg-row.assistant .bubble {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
  border-bottom-left-radius: 4px;
  box-shadow: var(--md-elevation-1);
}

/* Loading Dots */
.bubble.loading {
  padding: 12px 20px;
  color: var(--md-on-surface-variant);
}

.bubble.loading .dots {
  display: inline-flex;
  gap: 4px;
}

.bubble.loading .dots span {
  width: 6px;
  height: 6px;
  border-radius: var(--md-shape-full);
  background: currentColor;
  animation: dot-bounce 1.4s infinite ease-in-out both;
}

.bubble.loading .dots span:nth-child(1) { animation-delay: -0.32s; }
.bubble.loading .dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ========== Input Area ========== */
.input-area {
  padding: 16px 32px 24px;
  background: var(--md-surface);
  border-top: 1px solid var(--md-outline-variant);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: var(--md-surface-container-high);
  border-radius: var(--md-shape-xl);
  padding: 4px 4px 4px 20px;
  transition: box-shadow 0.2s;
}

.input-wrapper:focus-within {
  box-shadow: 0 0 0 2px var(--md-primary);
}

.input-wrapper :deep(.el-textarea) {
  flex: 1;
}

.input-wrapper :deep(.el-textarea__inner) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 10px 0;
  font-family: var(--md-font-family);
  font-size: var(--md-body-large);
  line-height: 1.5;
  resize: none;
}

.input-wrapper :deep(.el-textarea__inner::placeholder) {
  color: var(--md-outline);
}

.send-btn {
  background: var(--md-primary) !important;
  color: var(--md-on-primary) !important;
}

.send-btn:hover:not(:disabled) {
  background: #5D469A !important;
}

.send-btn:disabled {
  background: var(--md-surface-container-highest) !important;
  color: var(--md-outline) !important;
  cursor: not-allowed;
}
```

***

## 5. AppLayout 导航栏 MD 化设计

### 5.1 AppLayout.vue 模板

```vue
<!-- web/src/components/AppLayout.vue -->

<template>
  <div class="app-layout">
    <el-container>
      <!-- ========== MD Top App Bar (Center Aligned) ========== -->
      <header class="layout-app-bar">
        <!-- Leading: 品牌 Logo -->
        <div class="app-bar-leading">
          <el-icon class="menu-icon" @click="toggleSidebar"><Menu /></el-icon>
          <h1 class="brand" @click="$router.push('/agents')">
            <span class="brand-icon">🤖</span>
            <span class="brand-text">MetaAgent</span>
          </h1>
        </div>

        <!-- Center: Navigation (MD Filter Chips) -->
        <nav class="app-bar-center">
          <router-link 
            to="/agents" 
            class="md-nav-chip"
            exact-active-class="active"
          >
            <el-icon><ChatLineSquare /></el-icon>
            <span>智能体</span>
          </router-link>
          <router-link 
            to="/agents/discover" 
            class="md-nav-chip"
            active-class="active"
          >
            <el-icon><Search /></el-icon>
            <span>发现</span>
          </router-link>
          <router-link 
            to="/agents/create" 
            class="md-nav-chip primary"
            active-class="active"
          >
            <el-icon><Plus /></el-icon>
            <span>新建</span>
          </router-link>
        </nav>

        <!-- Trailing: User Menu -->
        <div class="app-bar-trailing">
          <el-dropdown @command="handleCommand" trigger="click">
            <el-avatar :size="36" class="user-avatar">
              {{ authStore.email?.charAt(0).toUpperCase() || 'U' }}
            </el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="user-dropdown-header">
                  <span class="user-email">{{ authStore.email }}</span>
                </div>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Main Content -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>
```

### 5.2 导航栏样式

```css
/* MD3 Top App Bar - Center Aligned */
.layout-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  box-shadow: var(--md-elevation-0);
  flex-shrink: 0;
}

.app-bar-leading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-icon {
  font-size: 24px;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  padding: 12px;
  border-radius: var(--md-shape-full);
  transition: background 0.2s;
}
.menu-icon:hover {
  background: var(--md-surface-container-high);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--md-title-large);
  font-weight: 500;
  color: var(--md-on-surface);
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  background: linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* MD Navigation Filter Chips */
.app-bar-center {
  display: flex;
  gap: 4px;
}

.md-nav-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container);
  color: var(--md-on-surface-variant);
  font-size: var(--md-label-large);
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.md-nav-chip:hover {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
}

.md-nav-chip.active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.md-nav-chip.primary {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.md-nav-chip.primary:hover {
  background: #5D469A;
}

.md-nav-chip.primary.active {
  background: #4E388F;
}

/* User Avatar */
.app-bar-trailing {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background: var(--md-primary-container) !important;
  color: var(--md-on-primary-container) !important;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
}

.user-avatar:hover {
  transform: scale(1.05);
}

/* User Dropdown */
.user-dropdown-header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--md-outline-variant);
  margin-bottom: 4px;
}

.user-email {
  font-size: var(--md-body-medium);
  color: var(--md-on-surface);
  font-weight: 500;
}

.layout-main {
  padding: 0;
  overflow: auto;
  height: calc(100vh - 64px);
  background: var(--md-surface);
}
```

***

## 6. 登录/注册页 MD 化设计

### 6.1 LoginView\.vue 布局

```vue
<!-- web/src/views/LoginView.vue -->

<template>
  <div class="auth-page">
    <!-- MD3 装饰背景 -->
    <div class="auth-bg-decoration"></div>
    
    <div class="auth-card md-elevation-3 md-shape-xl">
      <!-- Logo -->
      <div class="auth-brand">
        <div class="auth-logo">🤖</div>
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-subtitle">登录 MetaAgent 开始与你的 AI 伙伴对话</p>
      </div>

      <!-- 表单 -->
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="your@email.com" size="large" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            show-password 
            placeholder="请输入密码"
            size="large"
          />
        </el-form-item>
        
        <el-form-item>
          <button 
            class="md-filled-button full-width"
            :disabled="loading"
            @click.prevent="handleLogin"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span>登录</span>
          </button>
        </el-form-item>
      </el-form>

      <!-- 底部链接 -->
      <div class="auth-footer">
        <span>还没有账号？</span>
        <a @click="router.push('/register')">立即注册</a>
      </div>
    </div>
  </div>
</template>
```

### 6.2 登录页样式

```css
/* Auth Pages - MD3 Style */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, 
              var(--md-surface) 0%, 
              var(--md-primary-container) 100%);
  position: relative;
  overflow: hidden;
}

/* 装饰性圆（MD3 Pattern） */
.auth-bg-decoration {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, 
              rgba(103, 80, 164, 0.15) 0%, 
              transparent 70%);
  border-radius: var(--md-shape-full);
  top: -200px;
  right: -150px;
}

.auth-bg-decoration::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, 
              rgba(125, 82, 96, 0.12) 0%, 
              transparent 70%);
  border-radius: var(--md-shape-full);
  bottom: -300px;
  left: -100px;
}

.auth-card {
  position: relative;
  background: var(--md-surface-container-lowest);
  padding: 48px 40px;
  width: 420px;
  max-width: 90vw;
  z-index: 1;
}

.auth-brand {
  text-align: center;
  margin-bottom: 32px;
}

.auth-logo {
  width: 64px;
  height: 64px;
  background: var(--md-primary-container);
  border-radius: var(--md-shape-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 20px;
}

.auth-title {
  font-size: var(--md-display-small);
  font-weight: 400;
  color: var(--md-on-surface);
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.auth-subtitle {
  font-size: var(--md-body-medium);
  color: var(--md-on-surface-variant);
  margin: 0;
}

/* MD Filled Button */
.md-filled-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: var(--md-shape-full);
  background: var(--md-primary);
  color: var(--md-on-primary);
  font-family: var(--md-font-family);
  font-size: var(--md-label-large);
  font-weight: 500;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  box-shadow: var(--md-elevation-0);
}

.md-filled-button:hover:not(:disabled) {
  background: #5D469A;
  box-shadow: var(--md-elevation-1);
}

.md-filled-button:active:not(:disabled) {
  box-shadow: var(--md-elevation-0);
}

.md-filled-button:disabled {
  background: var(--md-surface-container-highest);
  color: var(--md-outline);
  cursor: not-allowed;
}

.md-filled-button.full-width {
  width: 100%;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: var(--md-body-medium);
  color: var(--md-on-surface-variant);
}

.auth-footer a {
  color: var(--md-primary);
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Loading Spinner */
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--md-on-primary);
  border-top-color: transparent;
  border-radius: var(--md-shape-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

***

## 7. main.ts 引入样式

```typescript
// web/src/main.ts

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

// ===== MD3 主题样式（必须在 Element Plus 之后引入以覆盖变量）=====
import './styles/material-tokens.css';
import './styles/element-overrides.css';
import './styles/global.css';

import App from './App.vue';
import router from './router';

const app = createApp(App);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component as any);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.mount('#app');
```

***

## 8. 图标组件映射

Element Plus Icons 中找到对应图标的组件名：

| MD 入口 | 图标 | EP 组件名           |
| ----- | -- | ---------------- |
| 返回    | ←  | `ArrowLeft`      |
| 邮件    | ✉️ | `Message`        |
| 记忆    | 🧠 | `Cpu`            |
| 通讯录   | 📒 | `AddressBook`    |
| 设置    | ⚙️ | `Setting`        |
| 发送    | ↑  | `Promotion`      |
| 菜单    | ☰  | `Menu`           |
| 发现    | 🔍 | `Search`         |
| 新建    | +  | `Plus`           |
| 聊天    | 💬 | `ChatLineSquare` |

***

## 9. 风险与注意事项

| #  | 风险点                                 | 应对方案                                                                                         |
| -- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| R1 | Element Plus 内部硬编码了非 CSS 变量的颜色      | 全局 CSS 选择器强制覆盖，`!important` 保底                                                               |
| R2 | EP 组件的 box-sizing 不一致               | `global.css` 开头统一 `box-sizing: border-box`                                                   |
| R3 | 自定义 md-icon-btn 与 EP el-button 样式冲突 | md-icon-btn 使用原生 `<button>`，不走 EP 组件                                                         |
| R4 | 图标按钮 48×48 热区可能挤压布局                 | 使用 flex 布局 + `min-width: 48px` 确保不被压缩                                                        |
| R5 | Material 颜色对比度可能不满足 WCAG            | 使用 MD3 官方 color tokens（已由 Material 团队验证过对比度）                                                 |
| R6 | 旧浏览器不支持 CSS Grid                    | `agent-grid` 使用 `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`，兼容 Chrome 57+ |
| R7 | 卡片点击与徽章点击事件冒泡                       | 使用 `@click.stop` 阻止冒泡                                                                        |

***

## 10. 修订记录

| 版本        | 日期         | 修改内容 | 修改人     |
| --------- | ---------- | ---- | ------- |
| v0.5.0-01 | 2026-09-04 | 初始草稿 | 产品经理智能体 |

