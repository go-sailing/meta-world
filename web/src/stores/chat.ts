import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
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

  function clear() {
    messages.value = [];
  }

  return { messages, isStreaming, push, appendLastToken, clear };
});
