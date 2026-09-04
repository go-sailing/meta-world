import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToolStepView {
  toolName: string;
  args: unknown;
  result: unknown;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  toolSteps?: ToolStepView[];
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMsg[]>([]);
  const isStreaming = ref(false);

  function push(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content });
  }

  function appendLastToken(token: string) {
    const last = messages.value[messages.value.length - 1];
    if (last && last.role === 'assistant') {
      last.content += token;
    } else {
      messages.value.push({ role: 'assistant', content: token });
    }
  }

  /** 在当前 assistant 消息上追加工具步骤 */
  function appendToolSteps(steps: ToolStepView[]) {
    // 先确保最后一条是 assistant 消息
    const last = messages.value[messages.value.length - 1];
    if (!last || last.role !== 'assistant') {
      messages.value.push({ role: 'assistant', content: '' });
    }
    const target = messages.value[messages.value.length - 1];
    target.toolSteps = [...(target.toolSteps || []), ...steps];
  }

  function clear() {
    messages.value = [];
  }

  return { messages, isStreaming, push, appendLastToken, appendToolSteps, clear };
});
