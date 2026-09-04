<template>
  <div class="agent-page-layout">
    <!-- ========== MD3 Top App Bar ========== -->
    <header class="chat-app-bar">
      <!-- 左侧：返回 + 智能体信息 -->
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
            <div class="agent-chips" v-if="agent?.persona_tags?.length">
              <span
                v-for="tag in agent.persona_tags.slice(0, 3)"
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
          @click="$router.push(`/chat/${agentId}`)"
          aria-label="对话"
          :title="'对话'"
        >
          <el-icon><ChatLineRound /></el-icon>
        </button>

        <button
          class="md-icon-btn"
          @click="$router.push(`/mailbox/${agentId}`)"
          aria-label="邮件"
          :title="'邮件'"
        >
          <el-icon><Message /></el-icon>
        </button>

        <button
          class="md-icon-btn"
          @click="$router.push(`/memory/${agentId}`)"
          aria-label="记忆"
          :title="'记忆'"
        >
          <el-icon><Cpu /></el-icon>
        </button>

        <button
          class="md-icon-btn"
          @click="$router.push(`/address-book/${agentId}`)"
          aria-label="通讯录"
          :title="'通讯录'"
        >
          <el-icon><Notebook /></el-icon>
        </button>

        <button
          class="md-icon-btn"
          @click="onSettingsClick"
          aria-label="设置"
          :title="'设置'"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </div>
    </header>

    <!-- ========== 页面内容（插槽） ========== -->
    <div class="agent-page-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { agentApi } from '../api/agent';
import { ElMessage } from 'element-plus';

const route = useRoute();
const agent = ref<any>(null);

const agentId = computed(() => route.params.agentId as string);

async function loadAgent(id: string) {
  try {
    agent.value = await agentApi.get(id);
  } catch {
    agent.value = null;
  }
}

function onSettingsClick() {
  ElMessage.info('设置页面开发中，敬请期待 ✨');
}

onMounted(() => {
  if (agentId.value) loadAgent(agentId.value);
});

watch(() => route.params.agentId, (newId) => {
  if (newId) loadAgent(newId as string);
});
</script>

<style scoped>
/* ========== 页面壳：Flex Column + 100% 高度 ========== */
.agent-page-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--md-surface);
  overflow: hidden;
}

/* ========== 内容区：自动填充 + 可滚动 ========== */
.agent-page-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ========== MD3 Top App Bar ========== */
.chat-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 12px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.app-bar-leading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-bar-leading .agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 4px;
}

.agent-info .agent-avatar {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 500;
}

.agent-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-text .agent-name {
  font-size: var(--md-title-medium);
  font-weight: 500;
  color: var(--md-on-surface);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.agent-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.app-bar-trailing {
  display: flex;
  align-items: center;
  gap: 0;
}
</style>
