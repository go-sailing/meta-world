<template>
  <div class="auth-page">
    <div class="auth-bg-decoration"></div>

    <div class="auth-card md-elevation-3">
      <div class="auth-brand">
        <div class="auth-logo">🤖</div>
        <h1 class="auth-title">创建账号</h1>
        <p class="auth-subtitle">注册 MetaAgent，拥有你的 AI 智能体伙伴</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="your@email.com" size="large" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="至少 8 位，含字母和数字"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <button
            class="md-filled-button full-width"
            :disabled="loading"
            @click.prevent="handleRegister"
          >
            <span v-if="loading" class="md-spinner"></span>
            <span>注册</span>
          </button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        <span>已有账号？</span>
        <a @click="router.push('/login')">立即登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { authApi } from '../api/auth';

const router = useRouter();

const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ email: '', password: '' });
const rules: FormRules = {
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [
    { min: 8, message: '至少 8 位', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, cb: any) => {
        const hasLetter = /[a-zA-Z]/.test(value);
        const hasDigit = /\d/.test(value);
        if (!hasLetter || !hasDigit) cb(new Error('密码需同时包含字母和数字'));
        else cb();
      },
      trigger: 'blur',
    },
  ],
};

async function handleRegister() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    await authApi.register(form.email, form.password);
    ElMessage.success('注册成功，请登录');
    router.replace('/login');
  } catch (err: any) {
    ElMessage.error(err.message || '注册失败');
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
