import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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
  /** 按 agent_id 分桶的消息存储 */
  const messagesByAgent = ref<Record<string, ChatMsg[]>>({});
  const currentAgentId = ref<string>('');
  const isStreaming = ref(false);

  /** 当前 agent 的消息列表（computed 自动分桶隔离） */
  const messages = computed<ChatMsg[]>(() => {
    if (!currentAgentId.value) return [];
    return messagesByAgent.value[currentAgentId.value] || [];
  });

  function setAgent(agentId: string) {
    currentAgentId.value = agentId;
    if (!messagesByAgent.value[agentId]) {
      messagesByAgent.value[agentId] = [];
    }
  }

  function setMessages(agentId: string, msgs: ChatMsg[]) {
    messagesByAgent.value[agentId] = [...msgs];
  }

  function push(role: 'user' | 'assistant', content: string) {
    if (!currentAgentId.value) return;
    const list = messagesByAgent.value[currentAgentId.value] ||= [];
    list.push({ role, content });
  }

  function appendLastToken(token: string) {
    if (!currentAgentId.value) return;
    const list = messagesByAgent.value[currentAgentId.value] ||= [];
    const last = list[list.length - 1];
    if (last && last.role === 'assistant') {
      last.content += token;
    } else {
      list.push({ role: 'assistant', content: token });
    }
  }

  function appendToolSteps(steps: ToolStepView[]) {
    if (!currentAgentId.value) return;
    const list = messagesByAgent.value[currentAgentId.value] ||= [];
    let last = list[list.length - 1];
    if (!last || last.role !== 'assistant') {
      list.push({ role: 'assistant', content: '' });
      last = list[list.length - 1];
    }
    last.toolSteps = [...(last.toolSteps || []), ...steps];
  }

  /** 清空当前 agent 的消息 */
  function clear() {
    if (currentAgentId.value) {
      messagesByAgent.value[currentAgentId.value] = [];
    }
  }

  return { messages, currentAgentId, isStreaming, setAgent, setMessages, push, appendLastToken, appendToolSteps, clear };
});
