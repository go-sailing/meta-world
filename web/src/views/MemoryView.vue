<template>
  <AgentPageLayout>
    <div class="memory-content">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-segmented v-model="layerFilter" :options="layerOptions" @change="reload" />
        <el-select v-model="sourceFilter" placeholder="来源" style="width:160px;" @change="reload">
          <el-option label="全部来源" value="all" />
          <el-option label="对话" value="dialogue" />
          <el-option label="收到信件" value="letter_receive" />
          <el-option label="发出信件" value="letter_send" />
        </el-select>
        <el-radio-group v-model="sortBy" @change="reload">
          <el-radio-button value="confidence_desc">置信度 ↓</el-radio-button>
          <el-radio-button value="time_desc">时间 ↓</el-radio-button>
        </el-radio-group>
        <el-tag v-if="loading" size="small" type="info">加载中...</el-tag>
        <el-tag v-else type="info" size="small">共 {{ total }} 条</el-tag>
      </div>

      <!-- 列表 -->
      <el-empty v-if="!loading && items.length === 0" description="暂无记忆，去对话或发一封信吧 ✨">
        <template #default>
          <el-button type="primary" @click="$router.push(`/chat/${agentId}`)">开始对话</el-button>
        </template>
      </el-empty>

      <div v-else>
        <div v-for="item in items" :key="item.memory_id" class="memory-card">
          <div class="memory-header">
            <div class="memory-tags">
              <el-tag :type="layerTagType(item.layer)" size="small">{{ layerLabel(item.layer) }}</el-tag>
              <el-tag :type="sourceTagType(item.source_type)" size="small">{{ sourceLabel(item.source_type) }}</el-tag>
              <el-tag v-if="item.target_agent_name" size="small" type="info">🎯 {{ item.target_agent_name }}</el-tag>
            </div>
            <span class="memory-time">{{ formatTime(item.created_at) }}</span>
          </div>

          <!-- 置信度进度条 -->
          <div class="confidence-bar">
            <div class="confidence-label">
              <span>置信度</span>
              <span>{{ Math.round(item.confidence * 100) }}%</span>
            </div>
            <el-progress
              :percentage="Math.round(item.confidence * 100)"
              :stroke-width="6"
              :show-text="false"
              :color="confidenceColor(item.confidence)"
            />
          </div>

          <!-- 记忆正文 -->
          <div class="memory-body">
            {{ item.content }}
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="reload"
          />
        </div>
      </div>
    </div>
  </AgentPageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { listMemories } from '../api/memory';
import { ElMessage } from 'element-plus';
import type { MemoryListItem } from '@meta-world/shared';
import AgentPageLayout from '../components/AgentPageLayout.vue';

const route = useRoute();
const agentId = route.params.agentId as string;

const items = ref<MemoryListItem[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;

const layerFilter = ref<string>('all');
const sourceFilter = ref<string>('all');
const sortBy = ref<string>('confidence_desc');

const layerOptions = [
  { label: '全部', value: 'all' },
  { label: 'self 自我', value: 'self' },
  { label: 'world 世界', value: 'world' },
  { label: 'other 他人', value: 'other' },
];

function layerLabel(l: string) {
  return ({ self: '🧩 self 自我', world: '🌍 world 世界', other: '👥 other 他人' } as any)[l] || l;
}
function layerTagType(l: string): '' | 'success' | 'warning' | 'info' {
  return ({ self: 'success', world: 'warning', other: 'info' } as any)[l] || '';
}
function sourceLabel(s: string) {
  return ({ dialogue: '💬 对话', letter_receive: '📥 收到信件', letter_send: '📤 发出信件' } as any)[s] || s;
}
function sourceTagType(s: string): '' | 'primary' | 'success' | 'info' {
  return ({ dialogue: '', letter_receive: 'primary', letter_send: 'success' } as any)[s] || 'info';
}
function confidenceColor(c: number) {
  if (c >= 0.8) return '#67C23A';
  if (c >= 0.5) return '#E6A23C';
  return '#F56C6C';
}
function formatTime(t: string) {
  return t ? new Date(t).toLocaleString('zh-CN') : '';
}

async function reload() {
  loading.value = true;
  try {
    const res = await listMemories({
      agent_id: agentId,
      layer: layerFilter.value,
      source: sourceFilter.value,
      sort: sortBy.value,
      page: page.value,
      size: pageSize,
    });
    items.value = res.items;
    total.value = res.total;
  } catch (err: any) {
    ElMessage.error(err.message || '加载记忆失败');
  } finally {
    loading.value = false;
  }
}

onMounted(reload);
</script>

<style scoped>
.memory-content {
  padding: 20px 32px;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.memory-card {
  padding: 16px;
  border: 1px solid var(--md-outline-variant, #eee);
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--md-surface, #fff);
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.memory-tags {
  display: flex;
  gap: 8px;
  align-items: center;
}

.memory-time {
  color: var(--md-outline, #999);
  font-size: 12px;
}

.confidence-bar {
  margin-bottom: 8px;
}

.confidence-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--md-on-surface-variant, #666);
  margin-bottom: 4px;
}

.memory-body {
  color: var(--md-on-surface, #333);
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
