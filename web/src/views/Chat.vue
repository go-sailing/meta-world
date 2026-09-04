<template>
  <el-container style="height: 100%;">
    <el-header style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #eee; height: auto; padding: 12px 20px;">
      <div>
        <h3 style="margin:0;">{{ agent?.name }}</h3>
        <el-tag v-for="t in agent?.persona_tags" :key="t" size="small" style="margin-right:4px;">{{ t }}</el-tag>
      </div>
      <div style="display:flex; gap:8px;">
        <el-button @click="$router.push(`/address-book/${agentId}`)">📒 通讯录</el-button>
        <el-button @click="$router.push(`/mailbox/${agentId}`)">📬 信件箱</el-button>
      </div>
    </el-header>

    <el-main style="display:flex; flex-direction:column; overflow:hidden; padding:0;">
      <!-- 消息列表 -->
      <div ref="scrollRef" style="flex:1; overflow-y:auto; padding:20px; background:#f5f5f5;">
        <el-empty v-if="chat.messages.length === 0" description="开始和你的智能体聊天吧" />
        <div v-for="(msg, i) in chat.messages" :key="i" style="display:flex; margin-bottom:16px;"
             :style="{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }">
          <el-card :style="{ maxWidth: '70%', background: msg.role === 'user' ? '#409eff' : '#fff', color: msg.role === 'user' ? '#fff' : '#333' }">
            <span style="white-space:pre-wrap;">{{ msg.content }}</span>
          </el-card>
        </div>
      </div>

      <!-- 输入框 -->
      <div style="padding:16px; border-top:1px solid #eee; background:#fff;">
        <div style="display:flex; gap:8px;">
          <el-input
            v-model="inputMsg"
            type="textarea"
            :rows="2"
            placeholder="输入消息..."
            @keydown.enter.ctrl="send"
            :disabled="chat.isStreaming"
          />
          <el-button type="primary" :loading="chat.isStreaming" @click="send" style="align-self:flex-end;">
            发送
          </el-button>
        </div>
        <div style="font-size:12px; color:#999; margin-top:4px;">Ctrl + Enter 发送</div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentStore } from '../stores/agent';
import { useChatStore } from '../stores/chat';
import { chatStream } from '../api/chat';
import { ElMessage } from 'element-plus';

const route = useRoute();
const agentId = route.params.agentId as string;
const store = useAgentStore();
const chat = useChatStore();

const inputMsg = ref('');
const scrollRef = ref<HTMLDivElement>();
const agent = store.current;

onMounted(() => {
  if (!store.current) {
    store.loadFromStorage();
  }
});

async function send() {
  const msg = inputMsg.value.trim();
  if (!msg || chat.isStreaming) return;
  inputMsg.value = '';

  chat.push('user', msg);
  chat.isStreaming = true;

  // 先推一个空的 assistant 消息（stream 时逐步填充）
  chat.push('assistant', '');
  await scrollToBottom();

  try {
    await chatStream(
      { agent_id: agentId, message: msg },
      {
        onToken: (t) => { chat.appendLastToken(t); scrollToBottom(); },
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
