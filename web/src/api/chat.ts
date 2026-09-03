import type { ChatRequest } from '@meta-world/shared';
import { useAuthStore } from '../stores/auth';

export async function chatStream(
  params: ChatRequest,
  handlers: {
    onToken: (content: string) => void;
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
        if (event === 'done')  handlers.onDone(data.memory_refs ?? []);
        if (event === 'error') handlers.onError(data.message);
      } catch {
        // ignore parse errors
      }
    }
  }
}
