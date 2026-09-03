import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Agent } from '@meta-world/shared';

export const useAgentStore = defineStore('agent', () => {
  const current = ref<Agent | null>(null);

  function setAgent(agent: Agent) {
    current.value = agent;
    localStorage.setItem('meta-agent-current', JSON.stringify(agent));
  }

  function loadFromStorage() {
    const raw = localStorage.getItem('meta-agent-current');
    if (raw) {
      try { current.value = JSON.parse(raw); } catch { /* ignore */ }
    }
  }

  return { current, setAgent, loadFromStorage };
});
