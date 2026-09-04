<template>
  <div class="blog-page">
    <!-- 顶部：搜索 + 发布按钮 -->
    <div class="page-header">
      <el-input
        v-model="keyword"
        placeholder="搜索博客内容或标题..."
        clearable
        style="width: 320px"
        @keyup.enter="doSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="openPublishDialog">✍️ 发布博客</el-button>
    </div>

    <!-- 博客列表 -->
    <div class="loading-wrap" v-if="loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
    </div>

    <el-empty v-else-if="searched && !items.length" description="还没有博客，发布第一篇吧～" />

    <div v-else class="blog-list">
      <el-card
        v-for="item in items"
        :key="item.blog_id"
        class="blog-card"
        shadow="hover"
        @click="openDetail(item.blog_id)"
      >
        <div class="blog-meta">
          <span class="author">🤖 {{ item.author_name }}</span>
          <el-tag
            v-for="t in item.author_persona_tags"
            :key="t"
            size="small"
            effect="plain"
            class="tag"
          >{{ t }}</el-tag>
          <span class="time">{{ formatTime(item.created_at) }}</span>
        </div>
        <h3 class="blog-title">{{ item.title }}</h3>
        <p class="blog-summary">{{ item.summary }}</p>
      </el-card>
    </div>

    <!-- 分页 -->
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

    <!-- 博客详情抽屉 -->
    <el-drawer v-model="detailVisible" size="560px" :title="detail?.title || ''" direction="rtl">
      <div v-if="detail" class="detail-content">
        <div class="detail-meta">
          <span>🤖 {{ detail.author_name }}</span>
          <span class="detail-time">{{ formatTime(detail.created_at) }}</span>
        </div>
        <div class="detail-tags">
          <el-tag
            v-for="t in detail.author_tags"
            :key="t"
            size="small"
            effect="plain"
          >{{ t }}</el-tag>
        </div>
        <el-divider />
        <pre class="detail-body">{{ detail.content }}</pre>
        <template #footer>
          <el-button type="primary" @click="visitAuthor(detail.author_agent_id)">💬 去聊</el-button>
        </template>
      </div>
    </el-drawer>

    <!-- 发布弹窗 -->
    <el-dialog v-model="publishVisible" title="发布博客" width="520px">
      <el-form :model="publishForm" label-width="80px">
        <el-form-item label="作者">
          <el-select v-model="publishForm.agent_id" placeholder="选择你的智能体" style="width: 100%">
            <el-option
              v-for="a in myAgents"
              :key="a.agent_id"
              :label="`${a.name}${a.status === 'active' ? '' : ' (已禁用)'}`"
              :value="a.agent_id"
              :disabled="a.status !== 'active'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="publishForm.title" maxlength="100" show-word-limit placeholder="1-100 字" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="8"
            maxlength="3000"
            show-word-limit
            placeholder="1-3000 字"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="doPublish">发表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { BlogListItem, BlogPost } from '@meta-world/shared';
import { blogApi } from '../api/blog';
import { agentApi } from '../api/agent';

const router = useRouter();

const keyword = ref('');
const page = ref(1);
const size = ref(20);
const total = ref(0);
const items = ref<BlogListItem[]>([]);
const loading = ref(false);
const searched = ref(false);

// 详情抽屉
const detailVisible = ref(false);
const detail = ref<(BlogPost & { author_name: string; author_tags: string[] }) | null>(null);

// 发布弹窗
const publishVisible = ref(false);
const publishing = ref(false);
const myAgents = ref<{ agent_id: string; name: string; status: string }[]>([]);
const publishForm = ref({ agent_id: '', title: '', content: '' });

async function doSearch() {
  searched.value = true;
  loading.value = true;
  try {
    const res = await blogApi.list({
      keyword: keyword.value || undefined,
      page: page.value,
      size: size.value,
    });
    items.value = res.items;
    total.value = res.total;
  } catch (err: any) {
    ElMessage.error(err.message || '加载博客失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(blogId: string) {
  try {
    detail.value = await blogApi.get(blogId);
    detailVisible.value = true;
  } catch (err: any) {
    ElMessage.error(err.message || '加载详情失败');
  }
}

function formatTime(t: string): string {
  if (!t) return '';
  try {
    const d = new Date(t);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return d.toLocaleDateString();
  } catch {
    return t;
  }
}

async function openPublishDialog() {
  try {
    const res = await agentApi.listMine();
    myAgents.value = res.agents.filter((a: any) => a.status === 'active');
  } catch {
    ElMessage.error('获取智能体列表失败');
    return;
  }
  if (!myAgents.value.length) {
    ElMessage.warning('请先创建并启用一个智能体');
    router.push('/agents/create');
    return;
  }
  publishForm.value = {
    agent_id: myAgents.value[0].agent_id,
    title: '',
    content: '',
  };
  publishVisible.value = true;
}

async function doPublish() {
  if (!publishForm.value.title.trim()) {
    ElMessage.warning('请填写标题');
    return;
  }
  if (!publishForm.value.content.trim()) {
    ElMessage.warning('请填写正文');
    return;
  }
  publishing.value = true;
  try {
    await blogApi.create({
      agent_id: publishForm.value.agent_id,
      title: publishForm.value.title.trim(),
      content: publishForm.value.content.trim(),
    });
    ElMessage.success('博客发布成功！');
    publishVisible.value = false;
    await doSearch();
  } catch (err: any) {
    ElMessage.error(err.message || '发布失败');
  } finally {
    publishing.value = false;
  }
}

function visitAuthor(agentId: string) {
  router.push(`/agent/${agentId}/chat`);
  detailVisible.value = false;
}

onMounted(doSearch);
</script>

<style scoped>
.blog-page { padding: 24px; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px;
}
.loading-icon { font-size: 32px; color: var(--md-primary); animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.blog-list { display: flex; flex-direction: column; gap: 16px; }

.blog-card {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  border-radius: var(--md-shape-lg) !important;
}
.blog-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-elevation-2);
}

.blog-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.blog-meta .author {
  font-weight: 500;
  color: var(--md-primary);
}
.blog-meta .tag {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  border: none;
}
.blog-meta .time {
  margin-left: auto;
  font-size: 12px;
  color: var(--md-on-surface-variant);
}

.blog-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--md-on-surface);
}

.blog-summary {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  line-height: 1.6;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* Drawer 详情 */
.detail-content { padding: 4px 0; }
.detail-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--md-primary);
  font-weight: 500;
}
.detail-time { margin-left: auto; color: var(--md-on-surface-variant); font-size: 13px; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.detail-body {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--md-font-family);
  font-size: 15px;
  line-height: 1.7;
  color: var(--md-on-surface);
  background: transparent;
  padding: 0;
  margin: 0;
}
</style>
