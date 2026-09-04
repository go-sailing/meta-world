<template>
  <el-container style="height: 100%;">
    <el-header style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #eee; height: auto; padding: 12px 20px;">
      <div>
        <h3 style="margin:0;">📬 信件箱</h3>
        <span style="color:#999; font-size:13px;">{{ agent?.name }} 的收件箱</span>
      </div>
      <div style="display:flex; gap:8px;">
        <el-button @click="$router.push('/agents')">← 返回主页面</el-button>
        <el-button @click="$router.push(`/chat/${agentId}`)">💬 对话</el-button>
      </div>
    </el-header>

    <el-main style="padding:20px;">
      <el-empty v-if="inbox.length === 0" description="暂无信件" />

      <div v-for="letter in inbox" :key="letter.letter_id"
           @click="openLetter(letter.letter_id)"
           style="padding:16px; border:1px solid #eee; border-radius:8px; margin-bottom:12px; cursor:pointer;"
           :style="{ background: letter.is_unread ? '#ecf5ff' : '#fff' }">
        <div style="display:flex; justify-content:space-between;">
          <div>
            <strong>{{ letter.from_name }}</strong>
            <el-tag v-if="letter.is_unread" size="small" type="danger" style="margin-left:8px;">未读</el-tag>
            <el-tag v-if="letter.status === 'replied'" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
            <el-tag v-if="letter.status === 'processing'" size="small" type="warning" style="margin-left:4px;">处理中</el-tag>
          </div>
          <span style="color:#999; font-size:12px;">{{ letter.sent_at }}</span>
        </div>
        <div style="color:#333; margin-top:6px;">{{ letter.subject || '(无主题)' }}</div>
      </div>

      <!-- 信件详情抽屉 -->
      <el-drawer v-model="detailVisible" title="信件详情" size="500px">
        <template v-if="detail">
          <p><strong>来自：</strong>{{ detail.from_agent_id }}</p>
          <p><strong>主题：</strong>{{ detail.subject || '(无)' }}</p>
          <el-divider />
          <p style="white-space:pre-wrap; line-height:1.6;">{{ detail.body }}</p>
          <el-divider />
          <div style="display:flex; gap:8px;">
            <el-button size="small" @click="reprocess">🔄 让智能体重新处理</el-button>
          </div>
        </template>
      </el-drawer>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentStore } from '../stores/agent';
import { listInbox, readLetter } from '../api/letter';
import { ElMessage } from 'element-plus';
import type { Letter } from '@meta-world/shared';

const route = useRoute();
const agentId = route.params.agentId as string;
const store = useAgentStore();
const agent = store.current;

const inbox = ref<any[]>([]);
const detail = ref<Letter | null>(null);
const detailVisible = ref(false);

onMounted(load);

async function load() {
  try {
    inbox.value = await listInbox(agentId);
  } catch (err: any) {
    ElMessage.error(err.message);
  }
}

async function openLetter(id: string) {
  try {
    detail.value = await readLetter(id);
    detailVisible.value = true;
    // 刷新列表（已读状态可能变了）
    await load();
  } catch (err: any) {
    ElMessage.error(err.message);
  }
}

async function reprocess() {
  if (!detail.value) return;
  try {
    await fetch(`/api/mail/${detail.value.letter_id}/reprocess`, { method: 'POST' });
    ElMessage.success('已触发重新处理');
    await load();
  } catch (err: any) {
    ElMessage.error(err.message);
  }
}
</script>
