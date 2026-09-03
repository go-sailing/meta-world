import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/CreateAgent.vue') },
    { path: '/chat/:agentId', component: () => import('./views/Chat.vue') },
    { path: '/mailbox/:agentId', component: () => import('./views/Mailbox.vue') },
  ],
});

export default router;
