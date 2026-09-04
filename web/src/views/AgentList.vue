<template>
  <div class="agent-list-page">
    <!-- 空状态 -->
    <div v-if="agents.length === 0" class="agent-list__empty">
      <el-empty description="还没有智能体，去创建第一个吧～" />
      <el-button type="primary" size="large" round @click="$router.push('/agents/create')">
        <el-icon><Plus /></el-icon>
        新建智能体
      </el-button>
    </div>

    <!-- 卡片网格 -->
    <div v-else class="agent-grid">
      <div
        v-for="agent in agents"
        :key="agent.agent_id"
        class="agent-card"
        :class="{ 'agent-card--disabled': agent.status === 'disabled' }"
        @click="handleCardClick(agent)"
        @keydown.enter="handleCardClick(agent)"
        tabindex="0"
        role="button"
        :aria-label="`进入 ${agent.name} 的聊天`"
      >
        <!-- 卡片头部：头像 + 名称/状态 -->
        <div class="agent-card__header">
          <el-avatar :size="48" class="agent-card__avatar">
            {{ agent.name.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="agent-card__info">
            <h3 class="agent-card__name">{{ agent.name }}</h3>
            <div class="agent-card__meta">
              <span v-if="agent.is_public" class="status-chip status-chip--public">公开</span>
              <span v-else class="status-chip status-chip--private">私有</span>
              <span v-if="agent.status === 'disabled'" class="status-chip status-chip--disabled">已禁用</span>
            </div>
          </div>
          <!-- 邮件徽章（独立点击区） -->
          <div v-if="agent.unread_count" class="agent-card__mail" @click.stop="goMailbox(agent.agent_id)">
            <el-badge :value="agent.unread_count" :max="99" class="mail-badge">
              <el-icon class="mail-icon"><Message /></el-icon>
            </el-badge>
          </div>
        </div>

        <!-- 卡片底部：persona tags -->
        <div class="agent-card__tags">
          <span
            v-for="tag in agent.persona_tags"
            :key="tag"
            class="persona-tag"
          >{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { AgentListItem } from '@meta-world/shared';
import { agentApi } from '../api/agent';

const router = useRouter();
const agents = ref<AgentListItem[]>([]);

async function loadAgents() {
  try {
    const res = await agentApi.listMine();
    agents.value = res.agents;
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败');
  }
}

function handleCardClick(agent: AgentListItem) {
  if (agent.status === 'disabled') {
    ElMessage.warning('该智能体已禁用');
    return;
  }
  router.push(`/chat/${agent.agent_id}`);
}

function goMailbox(agentId: string) {
  router.push(`/mailbox/${agentId}`);
}

onMounted(loadAgents);
</script>

<style scoped>
/* ===================== 页面容器 ===================== */
.agent-list-page {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;           /* 水平居中 */
  padding: 32px;            /* 四周留白 */
  box-sizing: border-box;
}

/* 空状态 */
.agent-list__empty {
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

/* ===================== 卡片网格 ===================== */
.agent-grid {
  display: grid;
  /* 自适应列数：每列最小 300px，自动填充 */
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  align-items: start;
  justify-items: stretch;    /* 每列卡片等宽 */
}

/* ===================== 单张卡片 ===================== */
.agent-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  background: var(--md-surface-container-low);
  border-radius: var(--md-shape-lg);
  box-shadow: var(--md-elevation-1);
  padding: 20px;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1),
    transform 0.2s cubic-bezier(0.2, 0, 0, 1),
    background 0.2s;
  border: 1px solid transparent;
  outline: none;
  overflow: hidden;
  position: relative;
}

.agent-card:hover {
  box-shadow: var(--md-elevation-2);
  transform: translateY(-2px);
  border-color: var(--md-primary-container);
  background: var(--md-surface-container);
}

.agent-card:active {
  transform: translateY(0) scale(0.995);
  box-shadow: var(--md-elevation-1);
}

.agent-card:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

/* Disabled 态 */
.agent-card--disabled {
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: auto;
}

.agent-card--disabled:hover {
  transform: none;
  box-shadow: var(--md-elevation-1);
  border-color: transparent;
  background: var(--md-surface-container-low);
}

/* ---- 卡片头部 ---- */
.agent-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.agent-card__avatar {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 500;
  font-family: var(--md-font-family);
  flex-shrink: 0;
}

.agent-card__info {
  flex: 1 1 auto;
  min-width: 0;
}

.agent-card__name {
  margin: 0 0 6px 0;
  padding: 0;
  font-family: var(--md-font-family);
  font-size: var(--md-title-large);
  font-weight: 500;
  color: var(--md-on-surface);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 状态 Chip */
.status-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: var(--md-shape-full);
  font-family: var(--md-font-family);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.status-chip--public {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.status-chip--private {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
}

.status-chip--disabled {
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

/* ---- 邮件图标徽章 ---- */
.agent-card__mail {
  flex: 0 0 auto;
  flex-shrink: 0;
}

.mail-badge :deep(.el-badge__content) {
  background: var(--md-error);
  color: var(--md-on-error);
  border: none;
  box-shadow: none;
  font-size: 10px;
  font-weight: 600;
  top: 6px;
  right: 6px;
}

.mail-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  padding: 0;
  border-radius: var(--md-shape-full);
  transition: all 0.15s;
}

.mail-icon:hover {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

/* ---- 卡片底部：Persona Tags ---- */
.agent-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.persona-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: var(--md-shape-full);
  background: var(--md-surface-container-high);
  color: var(--md-on-surface-variant);
  border: 1px solid var(--md-outline-variant);
  font-family: var(--md-font-family);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  cursor: default;
}
</style>
