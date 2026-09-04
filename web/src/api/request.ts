import { useAuthStore } from '../stores/auth';
import router from '../router';

const BASE_URL = '/api';

export interface ApiError {
  error: string;
  message?: string;
}

export async function request<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const authStore = useAuthStore();
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) || {}),
  };
  // 只在 body 存在时才设置 Content-Type: application/json
  // 无 body 的 POST/PUT/DELETE（如 disable/remove）不能声明 JSON Content-Type，
  // 否则 Fastify 会以 "Body cannot be empty when content-type is set to 'application/json'" 拒绝
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    authStore.logout();
    // 用 Vue Router 跳转，不做整页刷新；避免视觉上"又刷回登录页"的抖动
    const current = window.location.pathname;
    if (current !== '/login' && current !== '/register') {
      router.replace({ path: '/login', query: { redirect: current } });
    }
    throw new Error('UNAUTHORIZED');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let body: ApiError = { error: 'UNKNOWN_ERROR' };
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error(body.message || body.error || res.statusText) as Error & { code?: string };
    err.code = body.error;
    throw err;
  }

  return res.json();
}
