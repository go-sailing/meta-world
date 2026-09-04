import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { authApi } from './api/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('./views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('./views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      redirect: '/agents',
    },
    {
      path: '/agents',
      name: 'AgentList',
      component: () => import('./views/AgentList.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/agents/create',
      name: 'CreateAgent',
      component: () => import('./views/CreateAgent.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/agents/discover',
      name: 'Discover',
      component: () => import('./views/Discover.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat/:agentId',
      name: 'Chat',
      component: () => import('./views/Chat.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mailbox/:agentId',
      name: 'Mailbox',
      component: () => import('./views/Mailbox.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/address-book/:agentId',
      name: 'AddressBook',
      component: () => import('./views/AddressBook.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

// 启动时做一次 token 校验：过期就清掉，避免 guard 放行后被 API 踢回
router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // localStorage 有 token 但 store 状态没同步（Pinia 初始值已读 localStorage，所以这里主要校验有效性）
  if (authStore.token && !authStore.user_id) {
    // 有 token 但缺 user_id → 不完整，清掉
    authStore.logout();
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    // 用 /auth/me 做真正有效性校验；如果失败，清 token 再跳登录
    try {
      await authApi.me();
    } catch {
      authStore.logout();
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    return true;
  }

  // 已登录用户访问登录/注册页 → 跳 /agents
  if (!to.meta.requiresAuth && authStore.isAuthenticated &&
      (to.path === '/login' || to.path === '/register')) {
    return { path: '/agents' };
  }
});

export default router;
