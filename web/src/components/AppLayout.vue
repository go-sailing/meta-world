<template>
  <div class="app-layout">
    <el-container>
      <!-- ========== MD3 Top App Bar ========== -->
      <header class="layout-app-bar">
        <!-- Leading: Brand -->
        <div class="app-bar-leading">
          <h1 class="brand" @click="$router.push('/agents')">
            <span class="brand-icon">🤖</span>
            <span class="brand-text">MetaAgent</span>
          </h1>
        </div>

        <!-- Center: Navigation -->
        <nav class="app-bar-center">
          <router-link
            to="/agents"
            class="md-nav-chip"
          >
            <el-icon><ChatLineSquare /></el-icon>
            <span>智能体</span>
          </router-link>
          <router-link
            to="/agents/discover"
            class="md-nav-chip"
          >
            <el-icon><Search /></el-icon>
            <span>发现</span>
          </router-link>
          <router-link
            to="/agents/create"
            class="md-nav-chip primary"
          >
            <el-icon><Plus /></el-icon>
            <span>新建</span>
          </router-link>
        </nav>

        <!-- Trailing: User Menu -->
        <div class="app-bar-trailing">
          <el-dropdown @command="handleCommand" trigger="click">
            <el-avatar :size="36" class="user-avatar">
              {{ authStore.email?.charAt(0).toUpperCase() || 'U' }}
            </el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="user-dropdown-header">
                  <span class="user-email">{{ authStore.email }}</span>
                </div>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Main -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    authStore.logout();
    router.replace('/login');
  }
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
  background: var(--md-surface);
}

/* ========== MD3 Top App Bar ========== */
.layout-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  flex-shrink: 0;
}

.app-bar-leading {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: var(--md-title-large);
  font-weight: 500;
  color: var(--md-on-surface);
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  background: linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Navigation Chips */
.app-bar-center {
  display: flex;
  gap: 4px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.md-nav-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface-variant);
  font-size: var(--md-label-large);
  font-weight: 500;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  font-family: var(--md-font-family);
}

.md-nav-chip:hover {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
}

.md-nav-chip.router-link-active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.md-nav-chip.router-link-exact-active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.md-nav-chip.primary {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.md-nav-chip.primary:hover {
  background: #5D469A;
}

.md-nav-chip.primary.router-link-active {
  background: #4E388F;
}

/* User */
.app-bar-trailing {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 60px;
  justify-content: flex-end;
}

.user-avatar {
  background: var(--md-primary-container) !important;
  color: var(--md-on-primary-container) !important;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.user-dropdown-header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--md-outline-variant);
  margin-bottom: 4px;
}

.user-email {
  font-size: var(--md-body-medium);
  color: var(--md-on-surface);
  font-weight: 500;
}

/* Main */
.layout-main {
  padding: 0;
  overflow: auto;
  height: calc(100vh - 64px);
  background: var(--md-surface);
}
</style>
