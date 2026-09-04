<template>
  <div class="tool-call-card">
    <div class="tool-header">
      <span class="tool-icon">{{ icon }}</span>
      <span class="tool-name">{{ toolName }}</span>
      <span v-if="success" class="status success">
        <el-icon><Check /></el-icon>
      </span>
      <span v-else class="status error">
        <el-icon><Close /></el-icon>
      </span>
    </div>
    <div class="tool-content">
      <div class="tool-args" v-if="formatArgs">
        <span class="label">参数</span>
        <code>{{ formatArgs }}</code>
      </div>
      <div class="tool-result" v-if="resultPreview">
        <span class="label">结果</span>
        <code>{{ resultPreview }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  toolName: string;
  args: unknown;
  result: unknown;
  success?: boolean;
}>();

const TOOL_ICONS: Record<string, string> = {
  get_time: '🕐',
  file_read: '📖',
  file_write: '📝',
  file_list: '📂',
  file_delete: '🗑️',
  send_letter: '✉️',
};

const icon = computed(() => TOOL_ICONS[props.toolName] || '🔧');
const success = computed(() => props.success !== false);

const formatArgs = computed(() => {
  try {
    const str = typeof props.args === 'string' ? props.args : JSON.stringify(props.args);
    return str === '{}' || str === '' ? '' : str;
  } catch {
    return String(props.args);
  }
});

const resultPreview = computed(() => {
  if (!props.result) return '';
  // 如果有 success/data 包装，取 data
  let raw: any = props.result;
  if (raw && typeof raw === 'object' && 'data' in raw) raw = raw.data;
  try {
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
  } catch {
    return String(raw);
  }
});
</script>

<style scoped>
.tool-call-card {
  background: var(--md-surface-container);
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-shape-md);
  padding: 14px 16px;
  margin: 8px 0;
  font-size: var(--md-body-small);
  max-width: 100%;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tool-icon {
  font-size: 16px;
}

.tool-name {
  font-weight: 500;
  color: var(--md-on-surface);
  flex: 1;
}

.status {
  display: flex;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: var(--md-shape-full);
  font-size: 14px;
}

.status.success {
  background: var(--md-success-container);
  color: var(--md-on-success-container);
}

.status.error {
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-args, .tool-result {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.label {
  color: var(--md-outline);
  font-weight: 500;
  min-width: 48px;
  font-size: var(--md-label-small);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

code {
  font-family: var(--md-font-mono);
  font-size: 12px;
  color: var(--md-on-surface-variant);
  background: var(--md-surface-container-high);
  padding: 2px 6px;
  border-radius: var(--md-shape-xs);
  word-break: break-all;
}
</style>
