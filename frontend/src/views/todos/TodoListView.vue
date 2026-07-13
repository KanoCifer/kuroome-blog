<template>
  <div class="bg-background flex min-h-screen w-full flex-col">
    <!-- ── page header ── -->
    <header
      class="bg-background/85 border-border sticky top-0 z-10 flex flex-wrap items-end justify-between gap-3 border-b px-5 py-3 backdrop-blur-sm sm:px-8"
    >
      <div>
        <h1
          class="text-foreground font-serif text-2xl leading-tight font-medium tracking-tight"
        >
          开发任务
        </h1>
        <p class="text-muted-foreground mt-0.5 text-sm">
          网站开发需求与实现清单
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- tab bar -->
        <nav
          class="bg-muted flex gap-0.5 rounded-lg p-1"
          role="tablist"
          aria-label="工作台视角"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            role="tab"
            :aria-selected="activeTab === tab.id"
            class="relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
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
    <main class="w-full flex-1 overflow-y-auto px-5 py-5 sm:px-8">
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
        <p class="text-foreground text-lg font-medium">请登录后使用开发任务</p>
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
        <!-- ──── 推进 frontier ──── -->
        <div v-show="activeTab === 'frontier'" class="space-y-8">
          <!-- frontier cards -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                现在能做什么
              </h2>
              <span class="text-muted-foreground text-xs">
                无阻塞 · 按优先级与截止日排序
              </span>
            </div>

            <div
              v-if="store.frontier.length"
              class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <FrontierCard
                v-for="task in store.frontier"
                :key="task.id"
                :task="task"
                @open="openDetail(task.id)"
                @cycle="store.cycleStatus"
                @delete="handleDelete"
              />
            </div>
            <div
              v-else
              class="text-muted-foreground/70 flex flex-col items-center justify-center py-10 text-center"
            >
              <svg
                class="text-muted-foreground/30 mb-2 h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p class="text-sm font-medium">所有任务都已推进或还在阻塞中</p>
              <p class="text-xs">等待前置任务完成，或新建一个独立任务</p>
            </div>
          </section>

          <!-- in progress -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                进行中
              </h2>
              <span class="text-muted-foreground text-xs">正在推进的任务</span>
            </div>
            <div v-if="store.inProgress.length" class="space-y-2">
              <TaskRow
                v-for="task in store.inProgress"
                :key="task.id"
                :task="task"
                @open="openDetail(task.id)"
                @cycle="store.cycleStatus"
                @delete="handleDelete"
              />
            </div>
            <div
              v-else
              class="text-muted-foreground/70 flex items-center justify-center py-6 text-sm"
            >
              暂无进行中的任务
            </div>
          </section>

          <!-- done this week -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                本周已完成
              </h2>
              <span class="text-muted-foreground text-xs">最近关闭的任务</span>
            </div>
            <div v-if="store.completedThisWeek.length" class="space-y-2">
              <TaskRow
                v-for="task in store.completedThisWeek"
                :key="task.id"
                :task="task"
                :done="true"
                @open="openDetail(task.id)"
                @delete="handleDelete"
              />
            </div>
            <div
              v-else
              class="text-muted-foreground/70 flex items-center justify-center py-6 text-sm"
            >
              本周还没有完成的任务
            </div>
          </section>
        </div>

        <!-- ──── 规划 planning ──── -->
        <div v-show="activeTab === 'planning'" class="space-y-4">
          <!-- filter bar -->
          <div
            class="bg-muted flex flex-wrap items-center gap-2 rounded-xl px-4 py-3"
            role="group"
            aria-label="筛选条件"
          >
            <span
              class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
              >类型</span
            >
            <button
              v-for="t in TASK_TYPES"
              :key="t"
              class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
              :class="
                filterType.has(t)
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              :aria-pressed="filterType.has(t)"
              @click="toggleFilter('type', t)"
            >
              {{ t }}
            </button>

            <span class="bg-border mx-1 h-4 w-px" />

            <span
              class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
              >优先级</span
            >
            <button
              v-for="p in PRIORITIES"
              :key="p"
              class="rounded-full border px-2.5 py-0.5 text-xs transition-colors"
              :class="
                filterPriority.has(p)
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              :aria-pressed="filterPriority.has(p)"
              @click="toggleFilter('priority', p)"
            >
              {{ p }}
            </button>

            <span class="text-muted-foreground ml-auto text-xs tabular-nums">
              {{ filteredPlanning.length }} 项
            </span>
          </div>

          <!-- table -->
          <div class="border-border overflow-hidden rounded-xl border">
            <div
              class="text-muted-foreground bg-muted grid grid-cols-[2fr_1fr_1fr_1fr_100px_32px] gap-4 border-b px-4 py-2.5 text-[10px] font-medium tracking-widest uppercase max-sm:grid-cols-[1fr_80px_32px]"
            >
              <span>标题</span>
              <span class="max-sm:hidden">类型</span>
              <span class="max-sm:hidden">优先级</span>
              <span class="max-sm:hidden">范围</span>
              <span class="max-sm:hidden">状态</span>
              <span></span>
            </div>

            <div
              v-for="task in filteredPlanning"
              :key="task.id"
              class="hover:bg-muted/40 grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_100px_32px] items-center gap-4 border-t px-4 py-2.5 transition-colors max-sm:grid-cols-[1fr_80px_32px]"
              role="button"
              tabindex="0"
              @click="openDetail(task.id)"
              @keydown.enter="openDetail(task.id)"
            >
              <span class="text-foreground truncate text-sm font-medium">{{
                task.title
              }}</span>
              <span class="max-sm:hidden">
                <TypeBadge :type="task.type" />
              </span>
              <span class="max-sm:hidden">
                <PriorityBadge :priority="task.priority" />
              </span>
              <span
                class="text-muted-foreground truncate text-sm max-sm:hidden"
              >
                {{ task.scope || '—' }}
              </span>
              <span class="max-sm:hidden">
                <StatusChip :status="task.status" />
              </span>
              <span class="flex justify-end">
                <button
                  class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md p-1 transition-colors"
                  title="删除"
                  aria-label="删除"
                  @click.stop="handleDelete(task.id)"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </span>
            </div>

            <div
              v-if="!filteredPlanning.length"
              class="text-muted-foreground/70 px-4 py-8 text-center text-sm"
            >
              没有匹配的任务
            </div>
          </div>
        </div>

        <!-- ──── 回顾 review ──── -->
        <div v-show="activeTab === 'review'" class="space-y-8">
          <!-- stat cards -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                本周概览
              </h2>
              <span class="text-muted-foreground text-xs">{{
                store.weekRangeDisplay
              }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div
                v-for="stat in stats"
                :key="stat.label"
                class="border-border bg-background rounded-xl border px-5 py-4 shadow-[0_1px_1px_color-mix(in_oklch,var(--ink)_6%,transparent),0_6px_14px_color-mix(in_oklch,var(--ink)_10%,transparent),0_18px_32px_color-mix(in_oklch,var(--ink)_8%,transparent)]"
              >
                <div
                  class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
                >
                  {{ stat.label }}
                </div>
                <div
                  class="text-foreground font-family-averia mt-1 text-3xl leading-none font-normal tracking-tight"
                >
                  {{ stat.value }}
                </div>
                <div class="mt-1 text-xs" :class="stat.deltaClass">
                  {{ stat.delta }}
                </div>
              </div>
            </div>
          </section>

          <!-- type distribution -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                类型分布
              </h2>
              <span class="text-muted-foreground text-xs">全部任务</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="row in distributionRows"
                :key="row.type"
                class="flex items-center gap-3"
              >
                <span class="text-foreground w-16 shrink-0 text-sm">{{
                  row.type
                }}</span>
                <div class="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    class="h-full rounded-full transition-transform duration-400"
                    :style="{
                      width: '100%',
                      transform: `scaleX(${row.pct / 100})`,
                      backgroundColor: row.color,
                      transformOrigin: 'left',
                    }"
                  />
                </div>
                <span
                  class="text-muted-foreground w-6 shrink-0 text-right text-xs tabular-nums"
                  >{{ row.count }}</span
                >
              </div>
            </div>
          </section>

          <!-- completed timeline -->
          <section>
            <div class="mb-3 flex items-baseline justify-between">
              <h2
                class="text-foreground font-serif text-lg font-medium tracking-tight"
              >
                最近完成
              </h2>
              <span class="text-muted-foreground text-xs">按完成时间倒序</span>
            </div>
            <div class="space-y-0">
              <div
                v-for="task in store.completedThisWeek.slice(0, 8)"
                :key="task.id"
                class="flex gap-3 border-t px-1 py-3"
              >
                <div
                  class="mt-2 h-2 w-2 shrink-0 rounded-full"
                  style="background: var(--success)"
                />
                <div
                  class="min-w-0 flex-1 cursor-pointer"
                  @click="openDetail(task.id)"
                >
                  <p
                    class="text-muted-foreground truncate text-sm font-medium line-through"
                  >
                    {{ task.title }}
                  </p>
                  <p class="text-muted-foreground/60 text-[11px] tabular-nums">
                    {{ (task.updated_at ?? '').slice(0, 10) }}
                  </p>
                </div>
              </div>
              <div
                v-if="!store.completedThisWeek.length"
                class="text-muted-foreground/70 px-1 py-6 text-center text-sm"
              >
                本周还没有完成的任务
              </div>
            </div>
          </section>
        </div>
      </template>
    </main>

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
import type { DevTask, DevTaskPriority, DevTaskType } from '@/api/devtask';
import FrontierCard from './components/FrontierCard.vue';
import TaskRow from './components/TaskRow.vue';
import McpTokenModal from './components/McpTokenModal.vue';
import TaskDetailPanel from './components/TaskDetailPanel.vue';
import TypeBadge from './components/TypeBadge.vue';
import PriorityBadge from './components/PriorityBadge.vue';
import StatusChip from './components/StatusChip.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

const store = useV3DevTaskStore();

const TASK_TYPES: DevTaskType[] = ['功能需求', '问题', '优化', '技术债'];
const PRIORITIES: DevTaskPriority[] = ['P0 紧急', 'P1 高', 'P2 中', 'P3 低'];

// ── tab state ──
type TabId = 'frontier' | 'planning' | 'review';
const activeTab = ref<TabId>('frontier');

const tabs = computed(() => [
  { id: 'frontier' as const, label: '推进', count: store.frontier.length },
  { id: 'planning' as const, label: '规划', count: store.totalActive },
  { id: 'review' as const, label: '回顾', count: store.completedCount },
]);

// ── modal state ──
const modalOpen = ref(false);
const editingTask = ref<DevTask | null>(null);
const mcpTokenOpen = ref(false);

function openCreate() {
  editingTask.value = null;
  modalOpen.value = true;
}
function openEdit(id: string) {
  editingTask.value = store.tasks.find((t) => t.id === id) ?? null;
  detailOpen.value = false;
  modalOpen.value = true;
}
async function handleCreate(payload: Parameters<typeof store.createTask>[0]) {
  const task = await store.createTask(payload);
  if (task) modalOpen.value = false;
}
async function handleUpdate(
  id: string,
  patch: Parameters<typeof store.updateTask>[1],
) {
  const ok = await store.updateTask(id, patch);
  if (ok) modalOpen.value = false;
}
async function handleHardDelete(id: string) {
  await store.hardDeleteTask(id);
  modalOpen.value = false;
}

// ── detail panel state ──
const detailOpen = ref(false);
const detailTask = ref<DevTask | null>(null);

function openDetail(id: string) {
  detailTask.value = store.tasks.find((t) => t.id === id) ?? null;
  detailOpen.value = true;
}
async function handleSetStatus(id: string, status: DevTask['status']) {
  await store.updateTask(id, { status });
  // refresh local ref so panel re-renders
  detailTask.value = store.tasks.find((t) => t.id === id) ?? null;
}

// ── delete confirm ──
const deleteConfirmOpen = ref(false);
const pendingDeleteId = ref<string | null>(null);

function handleDelete(id: string) {
  pendingDeleteId.value = id;
  deleteConfirmOpen.value = true;
}
async function confirmDelete() {
  const id = pendingDeleteId.value;
  deleteConfirmOpen.value = false;
  pendingDeleteId.value = null;
  if (id) await store.deleteTask(id);
}

// ── planning filters ──
const filterType = ref<Set<DevTaskType>>(new Set());
const filterPriority = ref<Set<DevTaskPriority>>(new Set());

function toggleFilter(
  key: 'type' | 'priority',
  val: DevTaskType | DevTaskPriority,
) {
  if (key === 'type') {
    const set = filterType.value;
    if (set.has(val as DevTaskType)) set.delete(val as DevTaskType);
    else set.add(val as DevTaskType);
  } else {
    const set = filterPriority.value;
    if (set.has(val as DevTaskPriority)) set.delete(val as DevTaskPriority);
    else set.add(val as DevTaskPriority);
  }
}

const filteredPlanning = computed(() =>
  store.tasks
    .filter((t) => !t.is_deleted && t.status !== '已完成')
    .filter((t) =>
      filterType.value.size ? filterType.value.has(t.type) : true,
    )
    .filter((t) =>
      filterPriority.value.size ? filterPriority.value.has(t.priority) : true,
    ),
);

// ── review stats ──
const TYPE_COLORS: Record<DevTaskType, string> = {
  功能需求: 'var(--chart-1)',
  问题: 'var(--chart-4)',
  优化: 'var(--chart-5)',
  技术债: 'var(--chart-2)',
};

const stats = computed(() => [
  {
    label: '本周完成',
    value: store.completedThisWeek.length,
    delta: '较上周 +2',
    deltaClass: 'text-success',
  },
  {
    label: '累计任务',
    value: store.tasks.filter((t) => !t.is_deleted).length,
    delta: '全部生命周期',
    deltaClass: 'text-muted-foreground',
  },
  {
    label: '进行中',
    value: store.inProgress.length,
    delta: '需要跟进',
    deltaClass: 'text-muted-foreground',
  },
  {
    label: 'P0 紧急',
    value: store.urgentActive,
    delta: '需要关注',
    deltaClass: 'text-destructive',
  },
]);

const distributionRows = computed(() => {
  const dist = store.typeDistribution;
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  return (Object.keys(dist) as DevTaskType[]).map((type) => ({
    type,
    count: dist[type],
    pct: (dist[type] / total) * 100,
    color: TYPE_COLORS[type],
  }));
});

onMounted(() => {
  // 未登录时不请求 devtask，避免拦截器反复打 v3/dev-task/token 形成循环
  if (isAuthenticated.value) {
    store.fetchTasks();
  }
});
</script>
