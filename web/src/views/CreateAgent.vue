<template>
  <div class="page">
    <el-card style="max-width: 500px;">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="给智能体起个名字" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="性格标签" prop="persona_tags">
          <el-select
            v-model="form.persona_tags"
            multiple
            placeholder="选择 1-3 个标签"
            filterable
            :max-collapse-tags="2"
            style="width: 100%"
          >
            <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="公开">
          <el-switch
            v-model="form.is_public"
            active-text="公开（可在发现页被他人看到）"
            inactive-text="私有（仅自己可见）"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="onSubmit" style="width:100%;">
            创建智能体
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { agentApi } from '../api/agent';

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const tagOptions = [
  'friendly', 'curious', 'professional', 'playful',
  'patient', 'analytical', 'creative', 'thoughtful',
];

const form = reactive({
  name: '',
  persona_tags: [] as string[],
  is_public: false,
});

const rules: FormRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '2-20 字符', trigger: 'blur' },
  ],
  persona_tags: [
    { required: true, message: '请至少选一个标签', trigger: 'change' },
    { type: 'array', max: 3, message: '最多 3 个标签', trigger: 'change' },
  ],
};

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate();
  loading.value = true;
  try {
    const agent = await agentApi.create(form);
    ElMessage.success('创建成功！');
    router.push({ name: 'Chat', params: { agentId: agent.agent_id } });
  } catch (err: any) {
    ElMessage.error(err.message || '创建失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { padding: 24px; max-width: 600px; margin: 0 auto; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.topbar h2 { margin: 0; }
</style>
