<template>
  <div class="page">
    <el-row v-if="agents.length" :gutter="20">
      <el-col :span="8" v-for="agent in agents" :key="agent.agent_id">
        <el-card class="agent-card" shadow="hover">
          <div class="card-header">
            <div>
              <h3>{{ agent.name }}</h3>
              <el-tag v-if="agent.is_public" size="small" type="success">公开</el-tag>
              <el-tag v-else size="small">私有</el-tag>
              <el-tag v-if="agent.status === 'disabled'" size="small" type="danger">已禁用</el-tag>
            </div>
            <el-badge :value="agent.unread_count" :hidden="!agent.unread_count" class="mail-badge">
              <el-icon @click="$router.push(`/mailbox/${agent.agent_id}`)"><Message /></el-icon>
            </el-badge>
          </div>
          <div class="tags">
            <el-tag v-for="t in agent.persona_tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
          </div>
          <div class="card-actions">
            <el-button size="small" @click="$router.push(`/chat/${agent.agent_id}`)">💬 对话</el-button>
            <el-button size="small" @click="$router.push(`/address-book/${agent.agent_id}`)">📒 通讯录</el-button>
            <el-button size="small" @click="$router.push(`/mailbox/${agent.agent_id}`)">📮 信箱</el-button>
            <el-dropdown size="small" @command="(c: string) => handleAgentCommand(c, agent)">
              <el-button size="small" text>⚙️</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="'toggle-public:' + agent.agent_id">
                    {{ agent.is_public ? '设为私有' : '设为公开' }}
                  </el-dropdown-item>
                  <el-dropdown-item :command="'disable:' + agent.agent_id" v-if="agent.status === 'active'">
                    禁用
                  </el-dropdown-item>
                  <el-dropdown-item :command="'delete:' + agent.agent_id" divided style="color:#f56c6c">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-else description="还没有智能体，去创建第一个吧～" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { AgentListItem } from '@meta-world/shared';
import { agentApi } from '../api/agent';

const router = useRouter();
const agents = ref<AgentListItem[]>([]);

async function loadAgents() {
  try {
    const res = await agentApi.listMine();
    agents.value = res.agents;
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败');
  }
}

async function handleAgentCommand(cmd: string, agent: AgentListItem) {
  try {
    if (cmd.startsWith('toggle-public:')) {
      await agentApi.update(agent.agent_id, { is_public: !agent.is_public });
      ElMessage.success('已更新');
    } else if (cmd.startsWith('disable:')) {
      await agentApi.disable(agent.agent_id);
      ElMessage.success('已禁用');
    } else if (cmd.startsWith('delete:')) {
      await ElMessageBox.confirm('删除后无法恢复，确定要删除该智能体吗？', '危险操作', { type: 'warning' });
      await agentApi.hardDelete(agent.agent_id);
      ElMessage.success('已删除');
    }
    await loadAgents();
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err.message || '操作失败');
  }
}

onMounted(loadAgents);
</script>

<style scoped>
.page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.agent-card { margin-bottom: 20px; }
.card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 12px;
}
.card-header h3 { margin: 0 0 4px 0; }
.tags { margin-bottom: 16px; }
.tags .el-tag { margin-right: 6px; }
.card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.mail-badge :deep(.el-badge__content) { top: 8px; right: 8px; }
</style>
