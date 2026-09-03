import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';

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

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 保存要去的路径
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // 已登录用户访问登录页 → 跳首页
  if (!to.meta.requiresAuth && authStore.isAuthenticated &&
      (to.path === '/login' || to.path === '/register')) {
    return { path: '/agents' };
  }
});

export default router;
