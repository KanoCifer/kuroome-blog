<template>
  <!-- Floating trigger button -->
  <Teleport to="body">
    <div class="fixed right-4 bottom-40 z-50">
      <button
        @click="toggleDrawer"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out hover:shadow-lg"
        title="开发任务"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          任务
        </span>
      </button>
    </div>
  </Teleport>

  <!-- Right drawer -->
  <Teleport to="body">
    <AnimatePresence>
      <motion.div
        v-if="isOpen"
        :initial="{ opacity: 0, x: 40 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 40 }"
        :transition="{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }"
        class="bg-background border-border/60 fixed top-1/2 right-20 z-9999 flex max-w-lg min-w-90 -translate-y-1/2 justify-end rounded-2xl border shadow-2xl max-sm:right-2 max-sm:min-w-0"
        @click.self="close"
      >
        <div
          class="relative z-10 flex h-[90dvh] w-full flex-col overflow-hidden rounded-2xl"
        >
          <!-- Header -->
          <div
            class="border-border flex shrink-0 items-center justify-between border-b px-6 py-4"
          >
            <h3
              class="text-foreground flex items-center gap-2 font-serif text-lg font-medium"
            >
              开发任务
              <span class="text-muted-foreground text-sm font-normal">{{
                activeCount
              }}</span>
            </h3>
            <button
              @click="close"
              class="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors"
              aria-label="关闭"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <!-- 未登录空状态 -->
            <div
              v-if="!isAuthenticated"
              class="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center"
            >
              <svg
                class="text-muted-foreground/40 h-10 w-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <p class="text-muted-foreground text-sm">请登录后使用</p>
              <button
                class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-1 cursor-pointer rounded-lg px-4 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                @click="handleLogin"
              >
                去登录
              </button>
            </div>

            <!-- 已登录后的可交互内容 -->
            <div v-else>
              <!-- Collapsed add button -->
              <button
                v-if="!showAddForm"
                @click="showAddForm = true"
                class="border-border/60 bg-background/60 hover:border-primary/30 text-muted-foreground hover:text-foreground mb-5 flex w-full cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm shadow-sm transition-all"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                添加任务...
              </button>

              <!-- Expanded add form -->
              <div
                v-else
                class="border-border bg-background mb-5 rounded-xl border p-4 shadow-sm"
              >
                <input
                  ref="addTitleInput"
                  v-model="newTaskForm.title"
                  type="text"
                  placeholder="任务标题..."
                  class="placeholder:text-muted-foreground/50 text-foreground bg-muted focus:border-primary w-full rounded-lg border px-3 py-2 text-sm font-medium outline-none"
                  @keydown.enter="submitCreateTask"
                />
                <div class="mt-3 space-y-3">
                  <textarea
                    v-model="newTaskForm.description"
                    placeholder="描述... (可选)"
                    rows="3"
                    class="border-border bg-muted focus:border-primary placeholder:text-muted-foreground/50 text-foreground w-full resize-none rounded-lg border p-2.5 text-sm outline-none"
                  ></textarea>
                  <div class="flex flex-wrap items-center gap-2">
                    <select
                      v-model="newTaskForm.type"
                      class="border-border bg-muted text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
                    >
                      <option v-for="t in TASK_TYPES" :key="t" :value="t">
                        {{ t }}
                      </option>
                    </select>
                    <select
                      v-model="newTaskForm.priority"
                      class="border-border bg-muted text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
                    >
                      <option v-for="p in PRIORITIES" :key="p" :value="p">
                        {{ p }}
                      </option>
                    </select>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="newTaskForm.due_date"
                      type="date"
                      class="border-border bg-muted text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-sm outline-none"
                    />
                    <div class="ml-auto flex gap-2">
                      <button
                        @click="cancelAdd"
                        class="bg-muted text-foreground hover:bg-muted/80 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                      >
                        取消
                      </button>
                      <button
                        @click="submitCreateTask"
                        :disabled="!newTaskForm.title.trim()"
                        class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Status sections -->
              <div v-for="section in sections" :key="section.key" class="mb-5">
                <div class="mb-2 flex items-center gap-2 px-1">
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    :class="section.dotClass"
                  />
                  <h4 class="text-foreground text-sm font-semibold">
                    {{ section.title }}
                  </h4>
                  <span
                    class="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs tabular-nums"
                  >
                    {{ section.tasks.length }}
                  </span>
                </div>

                <TransitionGroup
                  tag="div"
                  class="space-y-2.5"
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-200 ease-out"
                  leave-from-class="opacity-100 scale-100"
                  leave-to-class="opacity-0 scale-95"
                  move-class="transition-transform duration-300"
                >
                  <DrawerTaskCard
                    v-for="task in section.tasks"
                    :key="task.id"
                    :task="task"
                    :done="section.key === 'done'"
                    @cycle-status="store.cycleStatus"
                    @delete-task="store.deleteTask"
                  />
                </TransitionGroup>

                <p
                  v-if="section.tasks.length === 0"
                  class="text-muted-foreground/60 py-4 text-center text-xs"
                >
                  {{ section.emptyText }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v';
import DrawerTaskCard from '@/views/todos/components/DrawerTaskCard.vue';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import type { DevTaskPriority, DevTaskType } from '@/api/devtask';
import { useTaskDrawer } from '@/composables/todo/useTaskDrawer';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/auth/stores/auth';
import router from '@/router';

const TASK_TYPES: DevTaskType[] = ['功能需求', '问题', '优化', '技术债'];
const PRIORITIES: DevTaskPriority[] = ['P0 紧急', 'P1 高', 'P2 中', 'P3 低'];

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

const store = useV3DevTaskStore();
const { tasks } = storeToRefs(store);

const { isOpen, close, toggle } = useTaskDrawer();
const toggleDrawer = toggle;

function handleLogin() {
  close();
  router.push('/login');
}

const activeCount = computed(
  () =>
    tasks.value.filter((t) => !t.is_deleted && t.status !== '已完成').length,
);

// v3 status → 三个视觉分组：开发中 / 待排期 / 已完成
const sections = computed(() => [
  {
    key: 'in-progress',
    title: '开发中',
    tasks: store.inProgress,
    dotClass: 'bg-primary',
    emptyText: '没有进行中的任务',
  },
  {
    key: 'upcoming',
    title: '待排期',
    tasks: tasks.value
      .filter(
        (t) =>
          !t.is_deleted &&
          (t.status === '待评估' ||
            t.status === '待排期' ||
            t.status === '已搁置'),
      )
      .sort((a, b) => {
        const w = (p: DevTaskPriority) =>
          ({ 'P0 紧急': 0, 'P1 高': 1, 'P2 中': 2, 'P3 低': 3 })[p] ?? 9;
        return w(a.priority) - w(b.priority);
      }),
    dotClass: 'bg-chart-3',
    emptyText: '没有待排期任务',
  },
  {
    key: 'done',
    title: '已完成',
    tasks: tasks.value
      .filter((t) => !t.is_deleted && t.status === '已完成')
      .slice(0, 8),
    dotClass: 'bg-emerald-500',
    emptyText: '没有已完成任务',
  },
]);

// 新建表单（折叠态）
const showAddForm = ref(false);
const addTitleInput = ref<HTMLInputElement | null>(null);

const newTaskForm = ref({
  title: '',
  description: '',
  due_date: '',
  type: '功能需求' as DevTaskType,
  priority: 'P2 中' as DevTaskPriority,
});

const submitCreateTask = async () => {
  if (!newTaskForm.value.title.trim()) return;
  await store.createTask({
    title: newTaskForm.value.title.trim(),
    description: newTaskForm.value.description.trim() || undefined,
    due_date: newTaskForm.value.due_date || undefined,
    type: newTaskForm.value.type,
    priority: newTaskForm.value.priority,
    scope: '',
  });
  newTaskForm.value = {
    title: '',
    description: '',
    due_date: '',
    type: '功能需求',
    priority: 'P2 中',
  };
  showAddForm.value = false;
};

const cancelAdd = () => {
  newTaskForm.value = {
    title: '',
    description: '',
    due_date: '',
    type: '功能需求',
    priority: 'P2 中',
  };
  showAddForm.value = false;
};

onMounted(() => {
  // 未登录时不请求 devtask：避免 devtaskRequest 拦截器反复打 v3/dev-task/token 形成循环
  if (isAuthenticated.value) {
    store.fetchTasks();
  }
});
</script>
