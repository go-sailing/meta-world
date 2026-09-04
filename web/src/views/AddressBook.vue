<template>
  <div class="page">
    <div class="page-actions">
      <span class="page-subtitle">通讯录 · {{ agent?.name }}</span>
    </div>

    <el-row v-if="friends.length" :gutter="20">
      <el-col :span="8" v-for="f in friends" :key="f.entry_id">
        <el-card class="friend-card" shadow="hover">
          <h3>{{ f.nickname || f.name }}
            <el-tag v-if="f.is_mutual" size="small" type="success">双向</el-tag>
            <el-tag v-else size="small">单向</el-tag>
          </h3>
          <div class="tags">
            <el-tag v-for="t in f.persona_tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
          </div>
          <div class="actions">
            <el-button size="small" type="primary" @click="openSendDialog(f.target_agent_id, f.name)">
              ✉️ 发信
            </el-button>
            <el-button size="small" text @click="removeFriend(f.entry_id)">移除</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-else description="通讯录为空，去发现页添加吧～" />

    <!-- 发信弹窗 -->
    <el-dialog v-model="dialogVisible" title="发送信件" width="480px">
      <el-form :model="letter" label-width="60px">
        <el-form-item label="收件人">
          <el-input v-model="letter.to_agent_id" disabled />
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="letter.subject" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="letter.body"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
            placeholder="写点什么吧..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="sendLetter">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FriendListItem } from '@meta-world/shared';
import { agentApi } from '../api/agent';
import { addressBookApi } from '../api/address-book';
import { sendLetter as sendLetterApi } from '../api/letter';

const route = useRoute();
const router = useRouter();
const agentId = computed(() => route.params.agentId as string);

const agent = ref<any>(null);
const friends = ref<FriendListItem[]>([]);

const dialogVisible = ref(false);
const sending = ref(false);
const letter = reactive({
  to_agent_id: '',
  subject: '',
  body: '',
});

async function load() {
  try {
    agent.value = await agentApi.get(agentId.value);
    const res = await addressBookApi.list(agentId.value);
    friends.value = res.friends;
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败');
    if (err.message?.includes('FORBIDDEN') || err.message?.includes('AGENT_NOT_FOUND')) {
      router.replace('/agents');
    }
  }
}

function openSendDialog(toAgentId: string, name: string) {
  letter.to_agent_id = toAgentId;
  letter.subject = '';
  letter.body = '';
  dialogVisible.value = true;
}

async function sendLetter() {
  if (!letter.body.trim()) {
    ElMessage.warning('正文不能为空');
    return;
  }
  sending.value = true;
  try {
    await sendLetterApi({
      from_agent_id: agentId.value,
      to_agent_id: letter.to_agent_id,
      subject: letter.subject || undefined,
      body: letter.body,
    });
    ElMessage.success('信件已发送');
    dialogVisible.value = false;
  } catch (err: any) {
    ElMessage.error(err.message || '发送失败');
  } finally {
    sending.value = false;
  }
}

async function removeFriend(entryId: string) {
  try {
    await ElMessageBox.confirm('确认移除该好友？', '提示', { type: 'warning' });
    await addressBookApi.remove(entryId);
    ElMessage.success('已移除');
    await load();
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败');
  }
}

onMounted(load);
</script>

<style scoped>
.page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.topbar h2 { margin: 0; }

.friend-card { margin-bottom: 20px; }
.friend-card h3 { margin: 0 0 8px 0; }
.tags { margin-bottom: 16px; }
.tags .el-tag { margin-right: 6px; }
.actions { display: flex; gap: 8px; }
</style>
