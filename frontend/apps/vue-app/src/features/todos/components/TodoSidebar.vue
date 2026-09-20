<template>
  <!-- 单层 sidebar，可折叠：
       展开 = 240px 菜单条（工作台标题 + 折叠按钮 + tab 列表 + 底部按钮）
       折叠 = 56px 图标条（logo + tab 图标 + 操作按钮 + 头像）
       sticky top-0 + 自带 h-screen → 始终占视口整高，main 主区独立 overflow-y-auto 滚动。
       折叠只动 main 的左 padding → Kanban grid 列宽恒定，零 reflow。 -->
  <aside
    :class="[
      'bg-secondary sticky top-0 z-20 hidden h-screen self-start overflow-hidden transition-[width] duration-200 ease-linear lg:flex lg:flex-col',
      collapsed ? 'w-14' : 'w-60',
    ]"
    :aria-label="collapsed ? '工作台（折叠）' : '工作台'"
  >
    <!-- ── 顶：工作台 / 折叠态 logo ── -->
    <div
      :class="[
        'flex shrink-0 py-6',
        collapsed
          ? 'flex-col items-center gap-2 px-0 opacity-100'
          : 'items-center justify-between px-4 pb-2 opacity-100 transition-opacity duration-200',
      ]"
    >
      <span
        v-if="!collapsed"
        class="text-muted font-serif text-xs tracking-widest"
        >工作台</span
      >
      <button
        type="button"
        :title="collapsed ? '展开工作台' : '收起工作台'"
        :aria-label="collapsed ? '展开工作台' : '收起工作台'"
        :aria-expanded="!collapsed"
        aria-controls="todo-sidebar-nav"
        class="text-muted hover:bg-accent/10 hover:text-ink focus-visible:ring-ring rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        @click="collapsed = !collapsed"
      >
        <ChevronLeft v-if="!collapsed" class="h-4 w-4" aria-hidden="true" />
        <ChevronRight v-else class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <!-- ── 折叠态 logo ── -->
    <RouterLink
      v-if="collapsed"
      to="/todos"
      title="开发任务"
      aria-label="开发任务"
      class="text-muted hover:text-ink focus-visible:ring-ring hover:bg-accent/10 mx-auto mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <KanbanSquare class="h-4 w-4" aria-hidden="true" />
    </RouterLink>

    <!-- ── 中：tab 列表（展开态显示文字+计数；折叠态只显示图标） ── -->
    <nav
      id="todo-sidebar-nav"
      role="tablist"
      aria-label="工作台视角"
      class="relative shrink-0"
      :class="collapsed ? 'flex flex-col items-center gap-1 px-0' : 'px-2'"
    >
      <!-- 滑动指示器（仅展开态） -->
      <span
        v-show="!collapsed"
        class="tab-indicator bg-accent/10 absolute top-0 left-2 z-0 h-9 w-[calc(100%-1rem)] rounded-lg shadow-[inset_0_1px_0_0_oklch(from_var(--page)_l_c_h_/_0.5),inset_0_-1px_1px_oklch(0_0_0_/_0.04)]"
        :style="{ transform: `translateY(${indicatorY}px)` }"
      />
      <button
        v-for="(tab, index) in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :title="collapsed ? tab.label : undefined"
        :class="[
          'focus-visible:ring-ring relative z-10 flex items-center rounded-lg text-sm font-medium transition-[color,transform,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96]',
          collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2 px-3 py-2',
          activeTab === tab.id ? 'text-ink' : 'text-muted hover:text-ink',
        ]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span v-if="!collapsed" class="flex-1 text-left">{{ tab.label }}</span>
        <span
          v-if="!collapsed"
          :class="[
            'inline-block min-w-[1.25rem] rounded-full px-1.5 text-center text-[10px] font-medium tabular-nums transition-[background-color,color] duration-150',
            index === activeTabIndex
              ? 'bg-accent/15 text-ink'
              : 'bg-surface/10 text-muted',
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </nav>

    <!-- ── 底：操作按钮 + 头像 ── -->
    <div
      :class="[
        'mt-auto shrink-0',
        collapsed
          ? 'flex flex-col items-center gap-1 pb-4'
          : 'border-t border-black/5 px-2 pt-3 pb-2',
      ]"
    >
      <!-- 展开态：刷新 + MCP Token（横排文字按钮） -->
      <template v-if="!collapsed && isAuthenticated">
        <button
          type="button"
          title="刷新任务列表"
          aria-label="刷新任务列表"
          :disabled="store.loading"
          class="text-muted hover:text-ink focus-visible:ring-ring hover:bg-accent/10 mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
          @click="handleRefresh"
        >
          <RotateCcw
            class="h-4 w-4 shrink-0"
            :class="
              store.loading ? 'animate-spin [animation-direction:reverse]' : ''
            "
            aria-hidden="true"
          />
          <span class="flex-1 text-left">刷新</span>
        </button>
        <button
          type="button"
          title="签发 MCP 服务 Token"
          aria-label="签发 MCP 服务 Token"
          class="text-muted hover:text-ink focus-visible:ring-ring hover:bg-accent/10 mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="emit('mcp-token')"
        >
          <KeyRound class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">MCP Token</span>
        </button>
        <button
          type="button"
          title="新建任务"
          aria-label="新建任务"
          class="text-ink bg-accent/15 hover:bg-accent/25 focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="emit('create')"
        >
          <Plus class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="flex-1 text-left">新建任务</span>
        </button>
      </template>

      <!-- 折叠态：纵向图标 -->
      <template v-if="collapsed && isAuthenticated">
        <button
          type="button"
          title="新建任务"
          aria-label="新建任务"
          class="text-ink bg-accent/15 hover:bg-accent/25 focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="emit('create')"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="刷新任务列表"
          aria-label="刷新任务列表"
          :disabled="store.loading"
          class="text-muted hover:text-ink focus-visible:ring-ring hover:bg-accent/10 flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
          @click="handleRefresh"
        >
          <RotateCcw
            class="h-4 w-4"
            :class="
              store.loading ? 'animate-spin [animation-direction:reverse]' : ''
            "
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          title="签发 MCP 服务 Token"
          aria-label="签发 MCP 服务 Token"
          class="text-muted hover:text-ink focus-visible:ring-ring hover:bg-accent/10 flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="emit('mcp-token')"
        >
          <KeyRound class="h-4 w-4" aria-hidden="true" />
        </button>
      </template>

      <!-- 头像（两种态都显示） -->
      <button
        type="button"
        :title="currentUserName"
        :aria-label="currentUserName"
        :class="
          collapsed
            ? 'focus-visible:ring-ring mt-2 h-8 w-8 overflow-hidden rounded-full ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
            : 'focus-visible:ring-ring mx-auto mt-2 flex h-9 w-9 items-center overflow-hidden rounded-full ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        "
      >
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="currentUserName"
          class="h-full w-full object-cover"
        />
        <span
          v-else
          class="bg-accent/20 text-ink flex h-full w-full items-center justify-center text-xs font-medium"
        >
          {{ userInitial }}
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Rocket,
  ClipboardList,
  KanbanSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  KeyRound,
} from '@lucide/vue';
import { useV3DevTaskStore } from '@/features/todos/stores/v3devtasks';
import { useAuthStore } from '@/features/auth';

const activeTab = defineModel<'frontier' | 'planning' | 'review' | 'kanban'>({
  required: true,
});
const collapsed = defineModel<boolean>('collapsed', { default: false });

const emit = defineEmits<{
  create: [];
  'mcp-token': [];
}>();

const store = useV3DevTaskStore();
const auth = useAuthStore();
const isAuthenticated = computed(() => auth.isAuthenticated);

const currentUserName = computed(() => auth.user?.name || '未登录');
const avatarUrl = computed(() => {
  if (auth.user?.photo?.startsWith('http')) {
    return auth.user.photo;
  }
  if (auth.user?.photo) {
    return `/v3/media/${auth.user.photo}`;
  }
  return '';
});
const userInitial = computed(() => currentUserName.value.slice(0, 1));

// Tab 按钮高度（展开态）：h-9 (36px)。
const TAB_ITEM_HEIGHT = 36;

const activeTabIndex = computed(() =>
  tabs.value.findIndex((t) => t.id === activeTab.value),
);
const indicatorY = computed(() => activeTabIndex.value * TAB_ITEM_HEIGHT);

// 计数全部走 store.derived —— 单次 O(N) 派生后这里 O(1) 读取。
const frontierCount = computed(() => store.derived.frontier.length);
const activeCount = computed(() => store.derived.activeCount);
const completedCount = computed(() => store.derived.completedCount);

function handleRefresh() {
  store.fetchTasks();
}

const tabs = computed(() => [
  {
    id: 'frontier' as const,
    label: '推进',
    icon: Rocket,
    count: frontierCount.value,
  },
  {
    id: 'planning' as const,
    label: '规划',
    icon: ClipboardList,
    count: activeCount.value,
  },
  {
    id: 'kanban' as const,
    label: '看板',
    icon: KanbanSquare,
    count: activeCount.value,
  },
  {
    id: 'review' as const,
    label: '回顾',
    icon: CheckCircle2,
    count: completedCount.value,
  },
]);
</script>

<style scoped>
/* Tab 指示器滑动过渡：与 BasicNav indicator 同缓动 cubic-bezier(.32,.72,0,1) */
.tab-indicator {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  .tab-indicator {
    transition: none;
  }
}
</style>
