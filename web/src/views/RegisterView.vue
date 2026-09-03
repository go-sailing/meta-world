<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>注册 MetaAgent</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="your@email.com" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 8 位，含字母和数字" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister">注册</el-button>
          <el-link type="primary" @click="router.push('/login')">已有账号？去登录</el-link>
        </el-form-item>
      </el-form>
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
  background: #f5f7fa;
}
.auth-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  width: 400px;
}
.auth-card h2 {
  margin: 0 0 24px 0;
  text-align: center;
}
</style>
