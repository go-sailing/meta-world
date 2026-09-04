<template>
  <div class="app-shell">
    <!-- ========== MD3 Top App Bar - 三段式 Flex ========== -->
    <header class="app-bar">
      <!-- 左段：品牌（固定，不压缩） -->
      <div class="app-bar__leading">
        <h1 class="brand" @click="$router.push('/agents')">
          <span class="brand__icon">🤖</span>
          <span class="brand__text">MetaAgent</span>
        </h1>
      </div>

      <!-- 中段：导航（居中，允许压缩和溢出） -->
      <nav class="app-bar__center">
        <router-link to="/agents" class="nav-chip">
          <el-icon><ChatLineSquare /></el-icon>
          <span>智能体</span>
        </router-link>
        <router-link to="/agents/discover" class="nav-chip">
          <el-icon><Search /></el-icon>
          <span>发现</span>
        </router-link>
        <router-link to="/agents/create" class="nav-chip nav-chip--primary">
          <el-icon><Plus /></el-icon>
          <span>新建</span>
        </router-link>
      </nav>

      <!-- 右段：用户头像（固定，不压缩） -->
      <div class="app-bar__trailing">
        <el-dropdown @command="handleCommand" trigger="click">
          <el-avatar :size="36" class="user-avatar" title="用户菜单">
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

    <!-- ========== 内容区：自动填充剩余高度 ========== -->
    <main class="app-content">
      <router-view />
    </main>
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
/* ========== 最外层壳：Column Flex + 100vh ========== */
.app-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  height: 100vh;
  background: var(--md-surface);
  overflow: hidden;  /* 只允许 content 区滚动 */
}

/* ===================== MD3 Top App Bar =====================
   三段式 Flex，无 position absolute：
   leading    → flex: 0 0 auto（固定尺寸）
   center     → flex: 1 1 auto（自适应，居中对齐，允许压缩）
   trailing   → flex: 0 0 auto（固定尺寸）
   ========================================================== */
.app-bar {
  flex: 0 0 64px;        /* 固定 64px，不参与剩余分配 */
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  box-shadow: var(--md-elevation-0);
  z-index: 10;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;      /* 内容溢出时裁剪，不撑破高度 */
}

/* ---- Leading ---- */
.app-bar__leading {
  flex: 0 0 auto;        /* 固定，不压缩 */
  min-width: 0;
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--md-on-surface);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;   /* 一行，不换行，不挤压中段 */
}

.brand__icon {
  font-size: 22px;
  flex-shrink: 0;
}

.brand__text {
  font-family: var(--md-font-family);
  font-size: 20px;
  font-weight: 500;
  background: linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  flex-shrink: 0;
}

/* ---- Center ---- */
.app-bar__center {
  flex: 1 1 auto;        /* 自适应，允许压缩 */
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;   /* 真实居中（在 flex 布局里自然居中，不脱离文档流）*/
  gap: 6px;
  overflow-x: auto;      /* 窗口过窄时可横向滚动 */
  padding: 0 8px;
}

.nav-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;        /* 每个 chip 固定，不压缩文字 */
  height: 40px;
  padding: 0 18px;
  border-radius: var(--md-shape-full);
  background: transparent;
  color: var(--md-on-surface-variant);
  font-family: var(--md-font-family);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  white-space: nowrap;
}

.nav-chip:hover {
  background: var(--md-surface-container-high);
  color: var(--md-on-surface);
}

.nav-chip.router-link-active,
.nav-chip.router-link-exact-active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.nav-chip--primary {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.nav-chip--primary:hover {
  background: #5D469A;
  color: var(--md-on-primary);
}

.nav-chip--primary.router-link-active {
  background: #4E388F;
}

/* ---- Trailing ---- */
.app-bar__trailing {
  flex: 0 0 auto;        /* 固定，不压缩 */
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.user-avatar {
  background: var(--md-primary-container) !important;
  color: var(--md-on-primary-container) !important;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
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
  font-family: var(--md-font-family);
  font-size: 14px;
  color: var(--md-on-surface);
  font-weight: 500;
}

/* ===================== 内容区 ===================== */
.app-content {
  flex: 1 1 auto;        /* 自动填充剩余高度 */
  min-height: 0;
  width: 100%;
  overflow-y: auto;      /* 内容区独立滚动 */
  overflow-x: hidden;
  background: var(--md-surface);
  box-sizing: border-box;
}
</style>
