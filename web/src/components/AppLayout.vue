<template>
  <div class="app-layout">
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <h1 class="brand" @click="$router.push('/agents')">🤖 MetaAgent</h1>
          <nav class="nav">
            <router-link to="/agents" class="nav-item">我的智能体</router-link>
            <router-link to="/agents/discover" class="nav-item">🔍 发现</router-link>
            <router-link to="/agents/create" class="nav-item">+ 新建</router-link>
          </nav>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-info">
              <el-avatar :size="32" style="background:#409eff">
                {{ authStore.email?.charAt(0).toUpperCase() || 'U' }}
              </el-avatar>
              <span class="email">{{ authStore.email }}</span>
              <el-icon class="caret"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

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
.app-layout { height: 100vh; }
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  padding: 0 24px;
  background: #fff;
  height: 60px;
  line-height: 60px;
}
.header-left { display: flex; align-items: center; gap: 32px; }
.brand {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  cursor: pointer;
  user-select: none;
}
.nav { display: flex; gap: 4px; }
.nav-item {
  padding: 6px 14px;
  border-radius: 6px;
  color: #606266;
  text-decoration: none;
  font-size: 14px;
  transition: all .15s;
}
.nav-item:hover { background: #f5f7fa; color: #409eff; }
.nav-item.router-link-active { color: #409eff; background: #ecf5ff; }
.header-right { display: flex; align-items: center; }
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  transition: background .15s;
}
.user-info:hover { background: #f5f7fa; }
.email { font-size: 13px; color: #606266; }
.caret { font-size: 12px; color: #909399; }
.layout-main {
  padding: 0;
  overflow: auto;
  height: calc(100vh - 60px);
}
</style>
