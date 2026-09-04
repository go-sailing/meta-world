<template>
  <div class="auth-page">
    <div class="auth-bg-decoration"></div>

    <div class="auth-card md-elevation-3">
      <!-- Logo -->
      <div class="auth-brand">
        <div class="auth-logo">🤖</div>
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-subtitle">登录 MetaAgent 开始与你的 AI 伙伴对话</p>
      </div>

      <!-- Form -->
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="your@email.com" size="large" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <button
            class="md-filled-button full-width"
            :disabled="loading"
            @click.prevent="handleLogin"
          >
            <span v-if="loading" class="md-spinner"></span>
            <span>登录</span>
          </button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        <span>还没有账号？</span>
        <a @click="router.push('/register')">立即注册</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ email: '', password: '' });
const rules: FormRules = {
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [{ min: 8, message: '至少 8 位', trigger: 'blur' }],
};

async function handleLogin() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    const result = await authApi.login(form.email, form.password);
    authStore.setAuth(result);
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string) || '/agents';
    router.replace(redirect);
  } catch (err: any) {
    ElMessage.error(err.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--md-surface) 0%, var(--md-primary-container) 100%);
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.auth-bg-decoration {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(103, 80, 164, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  top: -200px;
  right: -150px;
}

.auth-bg-decoration::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(125, 82, 96, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  bottom: -300px;
  left: -100px;
}

.auth-card {
  position: relative;
  background: var(--md-surface-container-lowest);
  padding: 48px 40px;
  width: 420px;
  max-width: 100%;
  border-radius: var(--md-shape-xl);
  z-index: 1;
}

.auth-brand {
  text-align: center;
  margin-bottom: 32px;
}

.auth-logo {
  width: 64px;
  height: 64px;
  background: var(--md-primary-container);
  border-radius: var(--md-shape-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 20px;
}

.auth-title {
  font-size: var(--md-display-small);
  font-weight: 400;
  color: var(--md-on-surface);
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.auth-subtitle {
  font-size: var(--md-body-medium);
  color: var(--md-on-surface-variant);
  margin: 0;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: var(--md-body-medium);
  color: var(--md-on-surface-variant);
}

.auth-footer a {
  color: var(--md-primary);
  font-weight: 500;
  margin-left: 4px;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
