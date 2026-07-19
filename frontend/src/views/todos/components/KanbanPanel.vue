<template>
  <div class="flex flex-col gap-4">
    <!-- ── 顶部筛选栏 ── -->
    <div
      class="bg-muted flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3"
      role="group"
      aria-label="看板筛选条件"
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

      <span class="bg-border mx-1 hidden h-4 w-px sm:inline-block" />

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

      <span class="bg-border mx-1 hidden h-4 w-px sm:inline-block" />

      <template>
        <span
          class="text-muted-foreground text-[10px] font-medium tracking-widest uppercase"
          >成员</span
        >
        <button
          v-for="m in memberChips"
          :key="m.userId"
          class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors"
          :class="
            filterMember.has(m.userId)
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground'
          "
          :aria-pressed="filterMember.has(m.userId)"
          :title="`仅看 ${m.label}`"
          @click="toggleFilter('member', m.userId)"
        >
          <MemberAvatar :user-id="m.userId" size="xs" />
          {{ m.label }}
        </button>
      </template>

      <!-- 搜索框 -->
      <label class="ml-auto flex items-center gap-1.5">
        <span class="sr-only">搜索任务标题</span>
        <svg
          class="text-muted-foreground h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="搜索标题…"
          class="border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-ring w-32 rounded-md border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:w-40"
        />
      </label>

      <span class="text-muted-foreground text-xs tabular-nums">
        {{ visibleTasks.length }} 项
      </span>
    </div>

    <!-- ── 四列看板 ── -->
    <div
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      role="list"
      aria-label="开发任务看板"
    >
      <section
        v-for="col in KANBAN_COLUMNS"
        :key="col.id"
        role="listitem"
        class="bg-muted/40 border-border flex min-h-96 flex-col rounded-xl border p-3 transition-colors"
        :class="
          dragOverColumn === col.id
            ? 'border-primary/60 bg-primary/5 ring-primary/30 ring-1'
            : ''
        "
        @dragover.prevent="onDragOver(col.id)"
        @dragleave="onDragLeave(col.id)"
        @drop.prevent="onDrop(col.id)"
      >
        <!-- 列头 -->
        <header class="mb-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              class="h-2 w-2 rounded-full"
              :class="col.dotClass"
              aria-hidden="true"
            />
            <h3
              class="text-foreground font-serif text-sm font-medium tracking-tight"
            >
              {{ col.label }}
            </h3>
            <span
              class="text-muted-foreground bg-background rounded-full px-1.5 py-px text-[10px] tabular-nums"
            >
              {{ columnCount(col.id) }}
            </span>
          </div>
        </header>

        <!-- 泳道 + 卡片 -->
        <div class="flex flex-1 flex-col gap-3 overflow-y-auto">
          <div
            v-for="lane in swimlanesFor(col.id)"
            :key="lane.userId"
            class="flex flex-col gap-2"
          >
            <div
              class="text-muted-foreground flex items-center gap-1.5 px-1 text-[10px] font-medium tracking-widest uppercase"
            >
              <MemberAvatar :user-id="lane.userId" size="xs" />
              {{ lane.label }}
              <span class="text-muted-foreground/60 tabular-nums">·</span>
              <span class="text-muted-foreground/60 tabular-nums">{{
                lane.tasks.length
              }}</span>
            </div>

            <KanbanCard
              v-for="task in lane.tasks"
              :key="task.slug"
              :task="task"
              :is-dragging="draggedSlug === task.slug"
              @open="$emit('open', $event)"
              @cycle="$emit('cycle', $event)"
              @delete="$emit('delete', $event)"
              @dragstart="onDragStart(task.slug)"
              @dragend="onDragEnd"
            />
          </div>

          <!-- 空列提示 -->
          <div
            v-if="!swimlanesFor(col.id).length"
            class="text-muted-foreground/60 flex flex-1 items-center justify-center py-6 text-center text-xs"
          >
            <span>
              {{ dragOverColumn === col.id ? '松开以放置' : '此列暂无任务' }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import type {
  DevTask,
  DevTaskPriority,
  DevTaskStatus,
  DevTaskType,
} from '@/api/devtask';
import { PRIORITIES } from '@/composables/todo';
import KanbanCard from './KanbanCard.vue';
import MemberAvatar from './MemberAvatar.vue';

// ── 看板列定义（与后端 DevTaskStatus 一一对应，仅"待办"合并两个未启动状态） ──
//
// 后端状态机 5 段，看板 4 列：
//   待办    ← 待评估 ∪ 待排期  （两个"未启动"状态合并为一列，方便规划视图）
//   进行中  ← 进行中           （直接对应后端）
//   已搁置  ← 已搁置           （直接对应后端，列名沿用后端命名）
//   已完成  ← 已完成           （直接对应后端）
//
// 这层映射只在 UI 视图层做，不改 store 的真实 status 字段 —— 拖拽落列时再回写
// 真实 status，保证数据契约稳定。
type KanbanColumnId = 'todo' | 'doing' | 'paused' | 'done';

interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  /** 该列覆盖的真实 DevTaskStatus（用于数据过滤）。 */
  statuses: DevTaskStatus[];
  /** 拖入此列时写回的真实 status。合并列默认写"待评估"，与 STATUS_CYCLE 起态一致。 */
  targetStatus: DevTaskStatus;
  /** 列头圆点颜色，对齐 StatusChip 语义色。 */
  dotClass: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    label: '待办',
    statuses: ['待评估', '待排期'],
    targetStatus: '待评估',
    dotClass: 'bg-muted-foreground',
  },
  {
    id: 'doing',
    label: '进行中',
    statuses: ['进行中'],
    targetStatus: '进行中',
    dotClass: 'bg-primary',
  },
  {
    id: 'paused',
    label: '已搁置',
    statuses: ['已搁置'],
    targetStatus: '已搁置',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'done',
    label: '已完成',
    statuses: ['已完成'],
    targetStatus: '已完成',
    dotClass: 'bg-emerald-500',
  },
];

const TASK_TYPES: DevTaskType[] = ['功能需求', '问题', '优化', '技术债'];

const store = useV3DevTaskStore();

const filterType = ref<Set<DevTaskType>>(new Set());
const filterPriority = ref<Set<DevTaskPriority>>(new Set());
const filterMember = ref<Set<number>>(new Set());
const searchTerm = ref('');

// ── 拖拽状态 ──
const draggedSlug = ref<string | null>(null);
const dragOverColumn = ref<KanbanColumnId | null>(null);

function onDragStart(slug: string) {
  draggedSlug.value = slug;
}
function onDragEnd() {
  draggedSlug.value = null;
  dragOverColumn.value = null;
}
function onDragOver(col: KanbanColumnId) {
  if (dragOverColumn.value !== col) dragOverColumn.value = col;
}
function onDragLeave(col: KanbanColumnId) {
  // 只在真正离开列区域时清空，避免子元素冒泡造成的闪烁
  if (dragOverColumn.value === col) dragOverColumn.value = null;
}
async function onDrop(col: KanbanColumnId) {
  const slug = draggedSlug.value;
  dragOverColumn.value = null;
  draggedSlug.value = null;
  if (!slug) return;

  const column = KANBAN_COLUMNS.find((c) => c.id === col);
  if (!column) return;

  const task = store.tasks.find((t) => t.slug === slug);
  if (!task) return;

  // 同列内拖动：顺序同步暂不处理（按需求"先不管顺序更新"），仅放空。
  // 视觉上仍会有 drop 高亮，但本地 sort_order 不变，所以位置看起来不变。
  if (column.statuses.includes(task.status)) return;

  // 跨列：直接调 store.updateTask PATCH 状态变更。
  // 它内部已经做"先打后端 → 成功则本地乐观更新 / 失败则报错"，无需手动改 store.tasks。
  // 注意"待办"列是待评估 ∪ 待排期的合并视图，column.targetStatus 固定为 '待评估'，
  // 与 STATUS_CYCLE 的起点一致 —— 跨列拖到"待办"的任务会以'待评估'落地。
  await store.updateTask(slug, { status: column.targetStatus });
}

// ── 筛选 / 成员聚合 ──
function toggleFilter(
  key: 'type' | 'priority' | 'member',
  val: DevTaskType | DevTaskPriority | number,
) {
  if (key === 'type') {
    const v = val as DevTaskType;
    const s = filterType.value;
    if (s.has(v)) s.delete(v);
    else s.add(v);
  } else if (key === 'priority') {
    const v = val as DevTaskPriority;
    const s = filterPriority.value;
    if (s.has(v)) s.delete(v);
    else s.add(v);
  } else {
    const v = val as number;
    const s = filterMember.value;
    if (s.has(v)) s.delete(v);
    else s.add(v);
  }
}

/** 成员 chip —— 从任务 user_id 聚合，始终显示（含仅 1 成员场景）。 */
const memberChips = computed(() => {
  const map = new Map<number, { count: number }>();
  for (const t of store.tasks) {
    if (t.is_deleted) continue;
    const e = map.get(t.user_id) ?? { count: 0 };
    e.count += 1;
    map.set(t.user_id, e);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([userId, { count }]) => ({
      userId,
      label: `用户 ${userId}`,
      count,
    }));
});

/** 全部未删除任务（受筛选条件影响）。 */
const visibleTasks = computed<DevTask[]>(() => {
  const q = searchTerm.value.trim().toLowerCase();
  return store.tasks
    .filter((t) => !t.is_deleted)
    .filter((t) =>
      filterType.value.size ? filterType.value.has(t.type) : true,
    )
    .filter((t) =>
      filterPriority.value.size ? filterPriority.value.has(t.priority) : true,
    )
    .filter((t) =>
      filterMember.value.size ? filterMember.value.has(t.user_id) : true,
    )
    .filter((t) => (q ? (t.title ?? '').toLowerCase().includes(q) : true));
});

function columnCount(col: KanbanColumnId): number {
  const statuses = KANBAN_COLUMNS.find((c) => c.id === col)?.statuses ?? [];
  return visibleTasks.value.filter((t) => statuses.includes(t.status)).length;
}

/**
 * 泳道 —— 在每个看板列里按 user_id 分组，始终展示标签头（含单成员场景）。
 * 单成员场景下所有卡片归入同一泳道，结构仍一致，便于未来扩展多成员。
 */
function swimlanesFor(col: KanbanColumnId): {
  userId: number;
  label: string;
  tasks: DevTask[];
}[] {
  const statuses = KANBAN_COLUMNS.find((c) => c.id === col)?.statuses ?? [];
  const inCol = visibleTasks.value
    .filter((t) => statuses.includes(t.status))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const grouped = new Map<number, DevTask[]>();
  for (const t of inCol) {
    const arr = grouped.get(t.user_id) ?? [];
    arr.push(t);
    grouped.set(t.user_id, arr);
  }

  return Array.from(grouped.entries()).map(([userId, tasks]) => ({
    userId,
    label: `用户 ${userId}`,
    tasks,
  }));
}

defineEmits<{
  open: [slug: string];
  cycle: [slug: string];
  delete: [slug: string];
}>();
</script>
