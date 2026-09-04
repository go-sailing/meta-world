<template>
  <div class="mailbox-content">
      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" @tab-change="loadCurrent" class="mailbox-tabs">
        <el-tab-pane label="📥 收件箱" name="inbox">
          <template #label>
            📥 收件箱
            <el-badge v-if="inboxUnread > 0" :value="inboxUnread" class="item" style="margin-left:4px;" />
          </template>
        </el-tab-pane>
        <el-tab-pane label="📤 已发送" name="sent" />
      </el-tabs>

      <!-- 收件箱列表 -->
      <el-empty v-if="activeTab === 'inbox' && !loading && inbox.length === 0" description="暂无收到的信件" />
      <el-empty v-if="activeTab === 'sent' && !loading && sent.length === 0" description="暂未发出过信件" />

      <!-- 收件箱内容 -->
      <div v-if="activeTab === 'inbox'">
        <div v-for="letter in inbox" :key="letter.letter_id"
             @click="openLetter(letter.letter_id)"
             class="letter-card"
             :class="{ unread: letter.is_unread }">
          <div class="letter-row">
            <div class="letter-from">
              <strong>{{ letter.from_name }}</strong>
              <el-tag v-if="letter.is_unread" size="small" type="danger" style="margin-left:8px;">未读</el-tag>
              <el-tag v-if="letter.status === 'replied'" size="small" type="success" style="margin-left:4px;">已回复</el-tag>
              <el-tag v-if="letter.status === 'processing'" size="small" type="warning" style="margin-left:4px;">处理中</el-tag>
              <el-tag v-if="letter.status === 'processing_failed'" size="small" type="danger" style="margin-left:4px;">处理失败</el-tag>
            </div>
            <span class="letter-time">{{ letter.sent_at }}</span>
          </div>
          <div class="letter-subject">{{ letter.subject || '(无主题)' }}</div>
        </div>
      </div>

      <!-- 已发送内容 -->
      <div v-if="activeTab === 'sent'">
        <div v-for="letter in sent" :key="letter.letter_id"
             @click="openSentLetterLogs(letter.letter_id)"
             class="letter-card">
          <div class="letter-row">
            <div class="letter-from">
              <strong>→ {{ letter.to_name }}</strong>
              <el-tag v-if="letter.status === 'sent'" size="small" style="margin-left:8px;">已发送</el-tag>
              <el-tag v-else-if="letter.status === 'delivered'" size="small" type="primary" style="margin-left:8px;">已投递</el-tag>
              <el-tag v-else-if="letter.status === 'processing'" size="small" type="warning" style="margin-left:8px;">对方处理中</el-tag>
              <el-tag v-else-if="letter.status === 'replied'" size="small" type="success" style="margin-left:8px;">✅ 对方已回复</el-tag>
              <el-tag v-else-if="letter.status === 'done'" size="small" type="info" style="margin-left:8px;">已读完</el-tag>
              <el-tag v-else-if="letter.status === 'processing_failed'" size="small" type="danger" style="margin-left:8px;">处理失败</el-tag>
            </div>
            <span class="letter-time">{{ letter.sent_at }}</span>
          </div>
          <div class="letter-subject">{{ letter.subject || '(无主题)' }}</div>
          <div v-if="letter.has_reply && letter.reply_preview" class="letter-reply">
            💬 对方回复: {{ letter.reply_preview }}...
          </div>
        </div>
      </div>

      <!-- 收件箱 信件详情 + 处理日志抽屉 -->
      <el-drawer v-model="detailVisible" title="信件详情" size="560px">
        <template v-if="detail">
          <p><strong>来自：</strong>{{ detail.from_agent_id }}</p>
          <p><strong>主题：</strong>{{ detail.subject || '(无)' }}</p>
          <el-divider />
          <p style="white-space:pre-wrap; line-height:1.6;">{{ detail.body }}</p>
          <el-divider />
          <div style="display:flex; gap:8px;">
            <el-button size="small" @click="reprocess">🔄 让智能体重新处理</el-button>
            <el-button size="small" type="primary" plain @click="showLogs(detail.letter_id)">📋 查看处理日志</el-button>
          </div>
        </template>
      </el-drawer>

      <!-- 处理日志抽屉 -->
      <el-drawer v-model="logsVisible" :title="logsTitle" size="520px">
        <template v-if="logsData">
          <div style="margin-bottom:12px;">
            <el-tag size="small" :type="statusTagType(logsData.letter.status)">
              {{ statusLabel(logsData.letter.status) }}
            </el-tag>
            <span style="color:#999; font-size:12px; margin-left:8px;">
              {{ logsData.letter.from_name }} → {{ logsData.letter.to_name }}
            </span>
          </div>

          <el-timeline v-if="logsData.logs.length > 0">
            <el-timeline-item
              v-for="log in logsData.logs"
              :key="log.seq"
              :timestamp="formatTime(log.created_at)"
              placement="top"
              :color="logColor(log.event_type)"
              :hollow="log.event_type === 'processing_error'"
            >
              <div style="font-weight:500; margin-bottom:4px;">
                <span>{{ logIcon(log.event_type) }}</span>
                {{ eventLabel(log.event_type) }}
              </div>
              <div v-if="log.detail" style="color:#666; font-size:13px;">
                <span v-if="typeof log.detail === 'string'">{{ log.detail }}</span>
                <template v-else>
                  <span v-if="log.detail.latency_ms">耗时: {{ log.detail.latency_ms }}ms</span>
                  <span v-if="log.detail.count">抽取记忆: {{ log.detail.count }} 条</span>
                  <span v-if="log.detail.should_reply !== undefined">回复决策: {{ log.detail.should_reply ? '是' : '否' }}</span>
                  <span v-if="log.detail.reason"> ({{ log.detail.reason }})</span>
                  <span v-if="log.detail.message" style="color:#F56C6C;">{{ log.detail.message }}</span>
                  <span v-if="log.detail.reply_letter_id">回复信 ID: {{ log.detail.reply_letter_id }}</span>
                  <span v-if="log.detail.note" style="color:#999; font-size:12px;">{{ log.detail.note }}</span>
                </template>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无处理日志" />
        </template>
      </el-drawer>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { listInbox, listSent, readLetter, getLetterLogs } from '../api/letter';
import { ElMessage } from 'element-plus';
import type { Letter, SentLetterListItem, LetterLogsResponse } from '@meta-world/shared';

const route = useRoute();
const agentId = route.params.agentId as string;

const activeTab = ref<'inbox' | 'sent'>('inbox');
const loading = ref(false);

const inbox = ref<any[]>([]);
const sent = ref<SentLetterListItem[]>([]);
const inboxUnread = computed(() => inbox.value.filter(l => l.is_unread).length);

const detail = ref<Letter | null>(null);
const detailVisible = ref(false);

const logsData = ref<LetterLogsResponse | null>(null);
const logsVisible = ref(false);
const logsTitle = computed(() => logsData.value ? `📋 ${logsData.value.letter.from_name} → ${logsData.value.letter.to_name}` : '处理日志');

onMounted(loadCurrent);

async function loadCurrent() {
  loading.value = true;
  try {
    if (activeTab.value === 'inbox') {
      inbox.value = await listInbox(agentId);
    } else {
      sent.value = await listSent(agentId);
    }
  } catch (err: any) {
    ElMessage.error(err.message);
  } finally {
    loading.value = false;
  }
}

async function openLetter(id: string) {
  try {
    detail.value = await readLetter(id);
    detailVisible.value = true;
    // 刷新列表（已读状态可能变了）
    if (activeTab.value === 'inbox') {
      inbox.value = await listInbox(agentId);
    }
  } catch (err: any) {
    ElMessage.error(err.message);
  }
}

async function openSentLetterLogs(id: string) {
  showLogs(id);
}

async function showLogs(letterId: string) {
  try {
    logsData.value = await getLetterLogs(letterId);
    logsVisible.value = true;
  } catch (err: any) {
    ElMessage.error(err.message || '加载处理日志失败');
  }
}

async function reprocess() {
  if (!detail.value) return;
  try {
    await fetch(`/api/mail/${detail.value.letter_id}/reprocess`, { method: 'POST' });
    ElMessage.success('已触发重新处理，稍后查看日志');
    setTimeout(async () => {
      await showLogs(detail.value!.letter_id);
    }, 500);
  } catch (err: any) {
    ElMessage.error(err.message);
  }
}

// —— 工具函数 ——
function formatTime(t: string) {
  return t ? new Date(t).toLocaleString('zh-CN') : '';
}
function logIcon(t: string) {
  return ({
    letter_received: '📬',
    llm_called: '🤖',
    memories_extracted: '🧠',
    reply_decision: '❓',
    reply_sent: '📤',
    processing_error: '⚠️',
  } as any)[t] || '•';
}
function eventLabel(t: string) {
  return ({
    letter_received: '信件已接收',
    llm_called: '调用 LLM',
    memories_extracted: '抽取记忆',
    reply_decision: '回复决策',
    reply_sent: '回复已发送',
    processing_error: '处理失败',
  } as any)[t] || t;
}
function logColor(t: string) {
  return ({
    letter_received: '#409EFF',
    llm_called: '#909399',
    memories_extracted: '#67C23A',
    reply_decision: '#E6A23C',
    reply_sent: '#67C23A',
    processing_error: '#F56C6C',
  } as any)[t] || '#909399';
}
function statusLabel(s: string) {
  return ({
    sent: '已发送',
    delivered: '已投递',
    read: '已读取',
    processing: '处理中',
    processing_failed: '处理失败',
    replied: '已回复',
    done: '已完成',
  } as any)[s] || s;
}
function statusTagType(s: string): '' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return ({
    sent: '',
    delivered: 'primary',
    read: 'info',
    processing: 'warning',
    processing_failed: 'danger',
    replied: 'success',
    done: 'info',
  } as any)[s] || '';
}
</script>

<style scoped>
.mailbox-content {
  padding: 20px 32px;
}

.mailbox-tabs {
  margin-bottom: 16px;
}

.letter-card {
  padding: 16px;
  border: 1px solid var(--md-outline-variant, #eee);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  background: var(--md-surface, #fff);
  transition: box-shadow 0.2s;
}
.letter-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.letter-card.unread {
  background: var(--md-primary-container, #ecf5ff);
}

.letter-row {
  display: flex;
  justify-content: space-between;
}
.letter-time {
  color: var(--md-outline, #999);
  font-size: 12px;
}
.letter-subject {
  color: var(--md-on-surface, #333);
  margin-top: 6px;
}
.letter-reply {
  color: #67C23A;
  font-size: 13px;
  margin-top: 6px;
}
</style>
