<template>
  <div class="tool-card">
    <div class="tool-header">
      <span class="tool-icon">{{ icon }}</span>
      <span class="tool-name">{{ toolName }}</span>
      <span v-if="success" class="status ok">✓</span>
      <span v-else class="status fail">✗</span>
    </div>
    <div class="tool-args" v-if="formatArgs">
      <span class="label">参数:</span> {{ formatArgs }}
    </div>
    <div class="tool-result" v-if="resultPreview">
      <span class="label">结果:</span> {{ resultPreview }}
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
  file_delete: '🗑',
  send_letter: '✉',
};

const icon = computed(() => TOOL_ICONS[props.toolName] || '🔧');
const success = computed(() => props.success !== false);

const formatArgs = computed(() => {
  if (!props.args || (typeof props.args === 'object' && Object.keys(props.args as any).length === 0)) {
    return '';
  }
  try {
    return JSON.stringify(props.args);
  } catch {
    return String(props.args);
  }
});

const resultPreview = computed(() => {
  if (!props.result) return '';
  // result 可能是 { success: true, data: ... } 或直接是原始结果
  const inner = (props.result as any)?.data !== undefined ? (props.result as any).data : props.result;
  try {
    const str = typeof inner === 'string' ? inner : JSON.stringify(inner);
    return str.length > 150 ? str.slice(0, 150) + '...' : str;
  } catch {
    return String(inner).slice(0, 150);
  }
});
</script>

<style scoped>
.tool-card {
  background: #f7f8fa;
  border-left: 3px solid #409eff;
  padding: 10px 14px;
  margin: 6px 0;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 500;
  color: #303133;
}
.tool-icon { font-size: 15px; }
.status.ok { color: #67c23a; }
.status.fail { color: #f56c6c; }
.label { color: #909399; margin-right: 4px; }
.tool-args, .tool-result {
  color: #606266;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}
</style>
