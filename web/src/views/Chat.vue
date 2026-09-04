<template>
  <div class="chat-page">
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
          @click="$router.push(`/mailbox/${agentId}`)"
          aria-label="邮件"
        >
          <el-icon><Message /></el-icon>
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
            <span class="dots"><span></span><span></span><span></span></span>
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

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentStore } from '../stores/agent';
import { useChatStore, type ChatMsg } from '../stores/chat';
import { useAuthStore } from '../stores/auth';
import { chatStream, getHistory } from '../api/chat';
import { ElMessage } from 'element-plus';
import ToolCallCard from '../components/ToolCallCard.vue';

const route = useRoute();
const store = useAgentStore();
const chat = useChatStore();
const authStore = useAuthStore();

const inputMsg = ref('');
const scrollRef = ref<HTMLDivElement>();
const agent = store.current;

const agentId = computed(() => route.params.agentId as string);

/** 从后端加载当前 agent 历史 */
async function loadHistory(id: string) {
  chat.setAgent(id);
  try {
    const data = await getHistory(id);
    const msgs: ChatMsg[] = data.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    chat.setMessages(id, msgs);
  } catch {
    chat.setMessages(id, []);
  }
  await nextTick();
  scrollToBottom();
}

onMounted(() => {
  if (!store.current) store.loadFromStorage();
  const id = route.params.agentId as string;
  if (id) loadHistory(id);
});

// 切换 agent 时重新加载
watch(() => route.params.agentId, (newId) => {
  if (newId && newId !== chat.currentAgentId) {
    loadHistory(newId as string);
  }
});

async function send() {
  const msg = inputMsg.value.trim();
  const id = route.params.agentId as string;
  if (!msg || chat.isStreaming || !id) return;
  inputMsg.value = '';

  chat.setAgent(id);
  chat.push('user', msg);
  chat.isStreaming = true;

  chat.push('assistant', '');
  await scrollToBottom();

  try {
    await chatStream(
      { agent_id: id, message: msg },
      {
        onToken: (t) => { chat.appendLastToken(t); scrollToBottom(); },
        onTools: (steps) => { chat.appendToolSteps(steps); scrollToBottom(); },
        onDone: () => {},
        onError: (m) => { ElMessage.error(m); },
      }
    );
  } catch (err: any) {
    ElMessage.error(err.message || '请求失败');
  } finally {
    chat.isStreaming = false;
    await scrollToBottom();
  }
}

function scrollToBottom() {
  return nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

function onSettingsClick() {
  ElMessage.info('设置页面开发中，敬请期待 ✨');
}
</script>

<style scoped>
/* ========== Chat Page Layout ========== */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--md-surface);
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

/* ========== MD Bubbles ========== */
.bubble {
  padding: 12px 16px;
  border-radius: var(--md-shape-lg);
  font-size: var(--md-body-medium);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

/* User Bubble - Primary Container */
.msg-row.user .bubble {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  border-bottom-right-radius: 4px;
}

/* Assistant Bubble - Surface Variant */
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
  gap: 8px;
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
  padding: 10px 0 !important;
  font-family: var(--md-font-family);
  font-size: var(--md-body-large);
  line-height: 1.5;
  resize: none;
  outline: none;
}

.input-wrapper :deep(.el-textarea__inner::placeholder) {
  color: var(--md-outline);
}

.send-btn {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.send-btn:hover:not(:disabled) {
  background: #5D469A;
}

.send-btn:disabled {
  background: var(--md-surface-container-highest);
  color: var(--md-outline);
  cursor: not-allowed;
}
</style>
