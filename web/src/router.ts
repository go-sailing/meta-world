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
      component: () => import('./components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/agents' },
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
          path: '/blog',
          name: 'Blog',
          component: () => import('./views/Blog.vue'),
          meta: { requiresAuth: true },
        },
        { path: '/agents/discover', redirect: '/blog' },

        // ========== 智能体工作台（共享标题栏，切换子页面时不重建） ==========
        {
          path: '/agent/:agentId',
          component: () => import('./components/AgentPageLayout.vue'),
          meta: { requiresAuth: true },
          children: [
            { path: '', redirect: 'chat' },
            {
              path: 'chat',
              name: 'Chat',
              component: () => import('./views/Chat.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'mailbox',
              name: 'Mailbox',
              component: () => import('./views/Mailbox.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'memory',
              name: 'Memory',
              component: () => import('./views/MemoryView.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'address-book',
              name: 'AddressBook',
              component: () => import('./views/AddressBook.vue'),
              meta: { requiresAuth: true },
            },
          ],
        },

        // ========== 旧路径 redirect（兼容书签 / 外部跳转） ==========
        { path: '/chat/:agentId', redirect: to => ({ name: 'Chat', params: to.params }) },
        { path: '/mailbox/:agentId', redirect: to => ({ name: 'Mailbox', params: to.params }) },
        { path: '/memory/:agentId', redirect: to => ({ name: 'Memory', params: to.params }) },
        { path: '/address-book/:agentId', redirect: to => ({ name: 'AddressBook', params: to.params }) },
      ],
    },
  ],
});

// 启动时做一次 token 校验：过期就清掉，避免 guard 放行后被 API 踢回
router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.user_id) {
    authStore.logout();
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
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
