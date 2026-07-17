<template>
  <div class="bg-background flex min-h-screen w-full flex-col">
    <!-- ── page header ── -->
    <header
      class="bg-background/75 border-border sticky top-0 z-10 flex flex-wrap items-end justify-between gap-3 border-b px-5 py-3 backdrop-blur-sm sm:px-8"
    >
      <div>
        <h1
          class="text-foreground font-serif text-2xl leading-tight font-medium tracking-tight"
        >
          开发任务
        </h1>
        <p class="text-muted-foreground mt-0.5 font-serif text-sm italic">
          Agent-native Task Dashboard
        </p>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="isAuthenticated">
          <button
            class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring border-border inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            title="签发 MCP 服务 Token"
            @click="mcpTokenOpen = true"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            MCP Token
          </button>

          <button
            class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring border-border inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm transition-[color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="store.loading"
            title="刷新任务列表"
            @click="store.fetchTasks()"
          >
            <svg
              class="h-4 w-4"
              :class="store.loading ? 'animate-spin' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            @click="openCreate"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            新建任务
          </button>
        </template>
      </div>
    </header>

    <!-- ── main content ── -->
    <div class="flex flex-1">
      <!-- ── sidebar (desktop tab nav) ── -->
      <aside
        class="border-border top-16 hidden w-52 shrink-0 space-y-1 self-start overflow-y-auto border-r px-4 py-6 lg:sticky lg:block lg:h-[calc(100vh-4rem)] lg:w-60"
      >
        <div class="px-3 pb-2">
          <span
            class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
            >工作台</span
          >
        </div>
        <nav role="tablist" aria-label="工作台视角" class="relative">
          <!-- 滑动指示器 -->
          <span
            class="tab-indicator bg-primary/10 absolute top-0 left-0 z-0 h-9 w-full rounded-lg shadow-[inset_0_1px_0_0_oklch(from_var(--paper)_l_c_h_/_0.5),inset_0_-1px_1px_oklch(0_0_0_/_0.04)]"
            :style="{ transform: `translateY(${indicatorY}px)` }"
          />
          <button
            v-for="(tab, index) in tabs"
            :key="tab.id"
            role="tab"
            :aria-selected="activeTab === tab.id"
            class="focus-visible:ring-ring relative z-10 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-[color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96]"
            :class="
              activeTab === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="activeTab = tab.id"
          >
            <span>{{ tab.label }}</span>
            <span
              class="ml-3 inline-block min-w-[1.25rem] rounded-full px-1.5 text-center text-[10px] font-medium tabular-nums transition-[background-color,color] duration-150"
              :class="
                index === activeTabIndex
                  ? 'bg-primary/15 text-foreground'
                  : 'bg-muted-foreground/10 text-muted-foreground'
              "
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </aside>

      <main class="w-full min-w-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
        <!-- mobile tab strip (in flow, below sticky header, clear of floating nav) -->
        <nav
          role="tablist"
          aria-label="工作台视角"
          class="bg-muted mb-5 flex gap-0.5 rounded-lg p-1 lg:hidden"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            role="tab"
            :aria-selected="activeTab === tab.id"
            class="focus-visible:ring-ring relative flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-[color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96]"
            :class="
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-[0_1px_2px_color-mix(in_oklch,var(--ink)_6%,transparent),inset_0_1px_0_0_oklch(from_var(--paper)_l_c_h_/_0.6)]'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span
              class="ml-1.5 inline-block min-w-[1.25rem] rounded-full px-1.5 text-center text-[10px] font-medium tabular-nums"
              :class="
                activeTab === tab.id
                  ? 'text-foreground bg-primary/15'
                  : 'text-muted-foreground bg-muted-foreground/10'
              "
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>

        <!-- 未登录空状态 -->
        <div
          v-if="!isAuthenticated"
          class="flex h-full min-h-96 flex-col items-center justify-center gap-3 text-center"
        >
          <svg
            class="text-muted-foreground/40 h-14 w-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p class="text-foreground text-lg font-medium">
            请登录后使用开发任务
          </p>
          <p class="text-muted-foreground max-w-xs text-sm">
            开发任务看板用于管理网站的需求、问题与技术债，登录后即可查看与新建。
          </p>
          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-1 cursor-pointer rounded-lg px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            @click="$router.push('/login')"
          >
            去登录
          </button>
        </div>

        <!-- 加载态 -->
        <div v-else-if="store.loading" class="space-y-3">
          <div class="bg-muted h-8 w-40 animate-pulse rounded-md" />
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="n in 3"
              :key="n"
              class="bg-muted h-28 animate-pulse rounded-xl"
            />
          </div>
        </div>

        <template v-else>
          <!-- Tab 内容：单 keyed 元素 + mode="out-in"，确保每次切换是
               一次干净的 enter/leave，不会多面板同时参与过渡。 -->
          <Transition
            enter-active-class="transition-all duration-280 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
            mode="out-in"
          >
            <component
              :is="activePanel"
              :key="activeTab"
              @open="openDetail"
              @cycle="store.cycleStatus"
              @delete="handleDelete"
            />
          </Transition>
        </template>
      </main>
    </div>

    <!-- ── create / edit modal ── -->
    <DevTaskModal
      :open="modalOpen"
      :task="editingTask"
      @close="modalOpen = false"
      @save-create="handleCreate"
      @save-update="handleUpdate"
      @hard-delete="handleHardDelete"
    />

    <!-- ── detail slide-out panel ── -->
    <TaskDetailPanel
      :open="detailOpen"
      :task="detailTask"
      @close="detailOpen = false"
      @set-status="handleSetStatus"
      @edit="openEdit"
      @delete="handleDelete"
    />

    <!-- ── MCP token ── -->
    <McpTokenModal :open="mcpTokenOpen" @close="mcpTokenOpen = false" />

    <!-- ── soft delete confirm ── -->
    <ConfirmDialog
      :open="deleteConfirmOpen"
      title="删除任务？"
      message="任务将被标记为已删除，可从后端恢复。"
      confirm-text="删除"
      cancel-text="取消"
      variant="default"
      @close="deleteConfirmOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DevTaskModal from './components/DevTaskModal.vue';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import { useAuthStore } from '@/auth/stores/auth';
import type { DevTask } from '@/api/devtask';
import McpTokenModal from './components/McpTokenModal.vue';
import TaskDetailPanel from './components/TaskDetailPanel.vue';
import FrontierPanel from './components/FrontierPanel.vue';
import PlanningPanel from './components/PlanningPanel.vue';
import ReviewPanel from './components/ReviewPanel.vue';
import type { Component } from 'vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

const store = useV3DevTaskStore();

// ── tab state ──
type TabId = 'frontier' | 'planning' | 'review';
const activeTab = ref<TabId>('frontier');

const TAB_ITEM_HEIGHT = 36;
const activeTabIndex = computed(() =>
  tabs.value.findIndex((t) => t.id === activeTab.value),
);
const indicatorY = computed(() => activeTabIndex.value * TAB_ITEM_HEIGHT);

const tabs = computed(() => [
  { id: 'frontier' as const, label: '推进', count: store.frontier.length },
  { id: 'planning' as const, label: '规划', count: store.totalActive },
  { id: 'review' as const, label: '回顾', count: store.completedCount },
]);

// 当前激活的 tab 面板组件（单 keyed 节点供 <Transition mode="out-in"> 切换）
const activePanel = computed((): Component => {
  if (activeTab.value === 'planning') return PlanningPanel;
  if (activeTab.value === 'review') return ReviewPanel;
  return FrontierPanel;
});

// ── modal state ──
const modalOpen = ref(false);
const editingTask = ref<DevTask | null>(null);
const mcpTokenOpen = ref(false);

function openCreate() {
  editingTask.value = null;
  modalOpen.value = true;
}
function openEdit(slug: string) {
  editingTask.value = store.tasks.find((t) => t.slug === slug) ?? null;
  detailOpen.value = false;
  modalOpen.value = true;
}
async function handleCreate(payload: Parameters<typeof store.createTask>[0]) {
  const task = await store.createTask(payload);
  if (task) modalOpen.value = false;
}
async function handleUpdate(
  slug: string,
  patch: Parameters<typeof store.updateTask>[1],
) {
  const ok = await store.updateTask(slug, patch);
  if (ok) modalOpen.value = false;
}
async function handleHardDelete(slug: string) {
  await store.hardDeleteTask(slug);
  modalOpen.value = false;
}

// ── detail panel state ──
const detailOpen = ref(false);
const detailTask = ref<DevTask | null>(null);

function openDetail(slug: string) {
  detailTask.value = store.tasks.find((t) => t.slug === slug) ?? null;
  detailOpen.value = true;
}
async function handleSetStatus(slug: string, status: DevTask['status']) {
  await store.updateTask(slug, { status });
  // refresh local ref so panel re-renders
  detailTask.value = store.tasks.find((t) => t.slug === slug) ?? null;
}

// ── delete confirm ──
const deleteConfirmOpen = ref(false);
const pendingDeleteSlug = ref<string | null>(null);

function handleDelete(slug: string) {
  pendingDeleteSlug.value = slug;
  deleteConfirmOpen.value = true;
}
async function confirmDelete() {
  const slug = pendingDeleteSlug.value;
  deleteConfirmOpen.value = false;
  pendingDeleteSlug.value = null;
  if (slug) await store.deleteTask(slug);
}

onMounted(() => {
  // 未登录时不请求 devtask，避免拦截器反复打 v3/dev-task/token 形成循环
  if (isAuthenticated.value) {
    store.fetchTasks();
  }
});
</script>

<style scoped>
/* Tab 指示器滑动过渡：与 BasicNav indicator 同缓动 cubic-bezier(.32,.72,0,1) */
.tab-indicator {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .tab-indicator {
    transition: none;
  }
}
</style>
