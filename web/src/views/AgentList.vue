<template>
  <div class="agent-list-page">
    <el-empty v-if="agents.length === 0" description="还没有智能体，去创建第一个吧～" />

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
        <div class="card-content">
          <!-- 顶部：头像 + 名称 + 状态 + 邮件徽章 -->
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

          <!-- 中部：persona tags -->
          <div class="agent-tags">
            <span
              v-for="tag in agent.persona_tags"
              :key="tag"
              class="md-filter-chip"
            >{{ tag }}</span>
          </div>
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

/* ========== Agent Card - MD3 Filled Card ========== */
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
  border: 1px solid transparent;
}

.agent-card:hover {
  box-shadow: var(--md-elevation-2);
  transform: translateY(-2px);
  border-color: var(--md-primary-container);
}

.agent-card:active {
  transform: translateY(0) scale(0.995);
  box-shadow: var(--md-elevation-1);
}

.agent-card:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

.agent-card.disabled {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: auto;
}

.agent-card.disabled:hover {
  transform: none;
  box-shadow: var(--md-elevation-1);
  border-color: transparent;
}

/* Card content */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Header */
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

/* Tag as MD Chip */
.md-chip {
  border-radius: var(--md-shape-full) !important;
  font-weight: 500;
  font-size: 11px;
  padding: 4px 10px !important;
  height: auto !important;
  background: var(--md-secondary-container) !important;
  color: var(--md-on-secondary-container) !important;
  border: none !important;
}

.md-chip.private {
  background: var(--md-surface-container-high) !important;
  color: var(--md-on-surface-variant) !important;
}

/* Persona Tags */
.agent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

/* Mail Badge (独立点击区) */
.mail-badge {
  margin-left: auto;
  flex-shrink: 0;
}

.mail-badge :deep(.el-badge__content) {
  background: var(--md-error);
  border: none;
  font-size: 11px;
  top: 4px;
  right: 4px;
}

.mail-icon {
  font-size: 20px;
  color: var(--md-on-surface-variant);
  cursor: pointer;
  padding: 10px;
  border-radius: var(--md-shape-full);
  transition: all 0.15s;
}

.mail-icon:hover {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}
</style>
