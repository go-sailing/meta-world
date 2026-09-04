import type { ChatRequest } from '@meta-world/shared';
import { useAuthStore } from '../stores/auth';
import type { ToolStepView } from '../stores/chat';

export async function getHistory(agentId: string): Promise<{ messages: { role: string; content: string }[] }> {
  const authStore = useAuthStore();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`;

  const res = await fetch(`/api/chat/history?agent_id=${encodeURIComponent(agentId)}`, { headers });
  if (res.status === 401) {
    authStore.logout();
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new Error('加载历史失败');
  return res.json();
}

export async function chatStream(
  params: ChatRequest,
  handlers: {
    onToken: (content: string) => void;
    onTools: (steps: ToolStepView[]) => void;
    onDone: (memory_refs: string[]) => void;
    onError: (msg: string) => void;
  }
): Promise<void> {
  const authStore = useAuthStore();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`;

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (res.status === 401) {
    authStore.logout();
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    handlers.onError('登录已过期');
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError('请求失败');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const evt of events) {
      const lines = evt.split('\n');
      const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
      const dataStr = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
      if (!event || !dataStr) continue;

      try {
        const data = JSON.parse(dataStr);
        if (event === 'token') handlers.onToken(data.content);
        else if (event === 'tools') handlers.onTools(data);
        else if (event === 'done') handlers.onDone(data.memory_refs ?? []);
        else if (event === 'error') handlers.onError(data.message);
      } catch {
        // ignore parse errors
      }
    }
  }
}
