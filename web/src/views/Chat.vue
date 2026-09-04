<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="agent-name">{{ agent?.name }}</div>
      <div class="header-actions">
        <el-button link size="small" @click="$router.push(`/memory/${$route.params.agentId}`)">🧠 记忆</el-button>
        <el-button link size="small" @click="$router.push(`/mailbox/${$route.params.agentId}`)">📬 信件</el-button>
      </div>
    </div>

    <!-- 消息区 -->
    <div ref="scrollRef" class="message-list">
      <el-empty v-if="chat.messages.length === 0" description="和智能体聊点什么吧..." :image-size="80" />
      
      <div v-for="(msg, i) in chat.messages" :key="i" 
           class="msg-row" :class="msg.role">
        <!-- 工具调用卡片（内嵌在 assistant 消息里） -->
        <ToolCallCard 
          v-for="(step, si) in (msg.toolSteps || [])" 
          :key="'tc-' + si"
          :tool-name="step.toolName" 
          :args="step.args"
          :result="step.result" 
          :success="(step.result as any)?.success" 
        />
        <!-- 消息正文 -->
        <div v-if="msg.content" class="bubble">
          {{ msg.content }}
        </div>
        <!-- 空 assistant 消息：加载指示器 -->
        <div v-else-if="msg.role === 'assistant' && !msg.content && !msg.toolSteps?.length" class="bubble loading">
          <span class="dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <el-input
        v-model="inputMsg"
        type="textarea"
        :rows="2"
        placeholder="和智能体聊点什么... (Ctrl+Enter 发送)"
        @keydown.enter.ctrl="send"
        :disabled="chat.isStreaming"
        resize="none"
      />
      <el-button type="primary" :loading="chat.isStreaming" @click="send">发送</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentStore } from '../stores/agent';
import { useChatStore, type ChatMsg } from '../stores/chat';
import { chatStream, getHistory } from '../api/chat';
import { ElMessage } from 'element-plus';
import ToolCallCard from '../components/ToolCallCard.vue';

const route = useRoute();
const store = useAgentStore();
const chat = useChatStore();

const inputMsg = ref('');
const scrollRef = ref<HTMLDivElement>();
const agent = store.current;

/** 从后端加载当前 agent 历史（仅第一次或切换 agent 时） */
async function loadHistory(agentId: string) {
  chat.setAgent(agentId);
  try {
    const data = await getHistory(agentId);
    const msgs: ChatMsg[] = data.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    chat.setMessages(agentId, msgs);
  } catch {
    // 新 agent 无历史，保持空
    chat.setMessages(agentId, []);
  }
  await nextTick();
  scrollToBottom();
}

onMounted(() => {
  if (!store.current) store.loadFromStorage();
  const id = route.params.agentId as string;
  if (id) loadHistory(id);
});

// 切换 agent 时自动重新加载
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

  // 先推一个空的 assistant 消息（stream 时逐步填充）
  chat.push('assistant', '');
  await scrollToBottom();

  try {
    await chatStream(
      { agent_id: id, message: msg },
      {
        onToken: (t) => { chat.appendLastToken(t); scrollToBottom(); },
        onTools: (steps) => {
          chat.appendToolSteps(steps);
          scrollToBottom();
        },
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
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafafa;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  background: #fff;
}
.agent-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}
.header-actions {
  display: flex;
  gap: 4px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.msg-row {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}
.msg-row.user {
  align-items: flex-end;
}
.msg-row.assistant {
  align-items: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
}
.msg-row.user .bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-row.assistant .bubble {
  background: #fff;
  color: #303133;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 思考中指示器 */
.bubble.loading {
  padding: 10px 18px;
  color: #909399;
}
.bubble.loading .dots span {
  display: inline-block;
  animation: bounce 1.4s infinite ease-in-out both;
}
.bubble.loading .dots span:nth-child(1) { animation-delay: -0.32s; }
.bubble.loading .dots span:nth-child(2) { animation-delay: -0.16s; }
.bubble.loading .dots span:nth-child(3) { animation-delay: 0s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.input-area {
  padding: 14px 20px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.input-area :deep(.el-textarea__inner) {
  border-radius: 8px;
}
</style>
