<template>
  <div class="page">
    <header class="topbar">
      <h2>发现智能体</h2>
      <el-input
        v-model="keyword"
        placeholder="搜索智能体名称"
        style="width: 300px"
        clearable
        @keyup.enter="doSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </header>

    <el-row v-if="items.length" :gutter="20">
      <el-col :span="8" v-for="item in items" :key="item.agent_id">
        <el-card class="discover-card" shadow="hover">
          <div>
            <h3>{{ item.name }}</h3>
            <p class="owner">创建者: {{ item.owner_email }}</p>
            <div class="tags">
              <el-tag v-for="t in item.persona_tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
            </div>
          </div>
          <div class="actions">
            <el-button size="small" type="primary" @click="askAddToAddressBook(item.agent_id)">
              ➕ 添加到通讯录
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-else-if="searched" description="没有找到匹配的智能体" />

    <div class="pagination" v-if="total > size">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        @current-change="doSearch"
        @size-change="doSearch"
      />
    </div>

    <!-- 选择己方智能体的弹窗 -->
    <el-dialog v-model="chooseDialogVisible" title="选择你的智能体" width="360px">
      <el-select v-model="selectedAgentId" placeholder="请选择" style="width: 100%">
        <el-option v-for="a in myAgents" :key="a.agent_id" :label="a.name" :value="a.agent_id" />
      </el-select>
      <template #footer>
        <el-button @click="chooseDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="confirmAdd">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { DiscoverAgentItem, AgentListItem } from '@meta-world/shared';
import { agentApi } from '../api/agent';
import { addressBookApi } from '../api/address-book';

const keyword = ref('');
const page = ref(1);
const size = ref(20);
const total = ref(0);
const items = ref<DiscoverAgentItem[]>([]);
const searched = ref(false);

// 添加到通讯录的临时状态
const myAgents = ref<AgentListItem[]>([]);
const targetAgentId = ref('');
const selectedAgentId = ref('');
const chooseDialogVisible = ref(false);
const adding = ref(false);

async function doSearch() {
  searched.value = true;
  try {
    const res = await agentApi.discover({ keyword: keyword.value || undefined, page: page.value, size: size.value });
    items.value = res.items;
    total.value = res.total;
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败');
  }
}

async function askAddToAddressBook(targetId: string) {
  targetAgentId.value = targetId;
  try {
    const res = await agentApi.listMine();
    myAgents.value = res.agents;
  } catch {
    ElMessage.error('获取你的智能体列表失败');
    return;
  }
  if (!myAgents.value.length) {
    ElMessage.warning('请先创建一个智能体');
    return;
  }
  selectedAgentId.value = myAgents.value[0].agent_id;
  chooseDialogVisible.value = true;
}

async function confirmAdd() {
  if (!selectedAgentId.value) return;
  adding.value = true;
  try {
    await addressBookApi.add(selectedAgentId.value, targetAgentId.value);
    ElMessage.success('已添加到通讯录');
    chooseDialogVisible.value = false;
  } catch (err: any) {
    ElMessage.error(err.message || '添加失败');
  } finally {
    adding.value = false;
  }
}

onMounted(doSearch);
</script>

<style scoped>
.page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.topbar h2 { margin: 0; }

.discover-card { margin-bottom: 20px; }
.discover-card h3 { margin: 0 0 4px 0; }
.owner { margin: 0 0 8px 0; font-size: 13px; color: #909399; }
.tags { margin-bottom: 16px; }
.tags .el-tag { margin-right: 6px; }
.actions { text-align: right; }
.pagination { display: flex; justify-content: center; margin-top: 20px; }
</style>
