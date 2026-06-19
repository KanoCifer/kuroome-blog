<template>
  <BasicDetail title="开发任务" subtitle="网站开发需求和实现清单">
    <div class="col-span-full mx-auto w-full max-w-7xl px-4">
      <!-- Done features -->
      <section v-if="doneList.length" class="mb-6">
        <button
          @click="doneExpanded = !doneExpanded"
          aria-label="展开或收起已实现功能"
          class="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-colors"
        >
          <svg
            class="h-4 w-4 shrink-0 transition-transform duration-200"
            :class="{ 'rotate-90': doneExpanded }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span class="text-sm font-medium">已实现功能</span>
          <span
            class="rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tabular-nums dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400"
          >
            {{ doneList.length }}
          </span>
        </button>

        <Transition name="done-expand">
          <ul
            v-if="doneExpanded"
            class="border-border/40 divide-border/30 bg-muted/30 mt-1 divide-y rounded-xl border"
          >
            <li
              v-for="task in doneList"
              :key="task.id"
              class="group flex items-center gap-3 px-3.5 py-2.5"
            >
              <svg
                class="h-4 w-4 shrink-0 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span
                class="text-muted-foreground min-w-0 flex-1 truncate text-sm"
              >
                {{ task.title }}
              </span>
              <button
                class="text-muted-foreground/0 hover:text-destructive group-hover:text-muted-foreground/60 shrink-0 cursor-pointer transition-colors"
                aria-label="删除"
                @click="todoStore.deleteTask(task.id)"
              >
                <svg
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </Transition>
      </section>

      <!-- Board -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <!-- 待办 -->
        <TodoColumn
          status="todo"
          title="待办"
          :tasks-count="todoList.length"
          bg="bg-blue-50/50 dark:bg-blue-950/30"
          dot="bg-blue-400/80"
          :adding-to-status="addingToStatus"
          @start-add="addingToStatus = $event"
          @submit-quick-add="handleQuickAdd('todo', $event)"
          @cancel-quick-add="addingToStatus = null"
        >
          <TransitionGroup
            ref="todoListEl"
            tag="ul"
            class="space-y-4"
            type="transition"
            name="todo-card"
          >
            <DevTaskCard
              v-for="task in todoList"
              :key="task.id"
              :task="task"
              @cycle-status="todoStore.cycleStatus"
              @delete-task="todoStore.deleteTask"
              @update-task="(id, patch) => todoStore.updateTask(id, patch)"
            />
            <li
              v-if="todoList.length === 0"
              key="empty"
              class="flex items-center justify-center py-16 text-sm text-gray-400"
            >
              拖拽任务到此处
            </li>
          </TransitionGroup>
        </TodoColumn>

        <!-- 开发中 -->
        <TodoColumn
          status="in-progress"
          title="开发中"
          :tasks-count="inProgressList.length"
          bg="bg-amber-50/50 dark:bg-amber-950/30"
          dot="bg-amber-400/80"
          :adding-to-status="addingToStatus"
          @start-add="addingToStatus = $event"
          @submit-quick-add="handleQuickAdd('in-progress', $event)"
          @cancel-quick-add="addingToStatus = null"
        >
          <TransitionGroup
            ref="inProgressListEl"
            tag="ul"
            class="space-y-4"
            type="transition"
            name="todo-card"
          >
            <DevTaskCard
              v-for="task in inProgressList"
              :key="task.id"
              :task="task"
              @cycle-status="todoStore.cycleStatus"
              @delete-task="todoStore.deleteTask"
              @update-task="(id, patch) => todoStore.updateTask(id, patch)"
            />
            <li
              v-if="inProgressList.length === 0"
              key="empty"
              class="flex items-center justify-center py-16 text-sm text-gray-400"
            >
              拖拽任务到此处
            </li>
          </TransitionGroup>
        </TodoColumn>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from '@/components/basic/BasicDetail.vue';
import DevTaskCard from './components/DevTaskCard.vue';
import TodoColumn from './components/TodoColumn.vue';
import type { DevTask, DevTaskStatus } from '@/api/todo';
import { useTodoStore } from '@/stores/todos';
import { useDraggable, type DraggableEvent } from 'vue-draggable-plus';
import { onMounted, ref, watch } from 'vue';

const todoStore = useTodoStore();

const isDragging = ref(false);
const doneExpanded = ref(false);

// Template refs for useDraggable
const todoListEl = ref<HTMLDivElement | null>(null);
const inProgressListEl = ref<HTMLDivElement | null>(null);

// Writable local copies for drag-and-drop
const todoList = ref<DevTask[]>([]);
const inProgressList = ref<DevTask[]>([]);
const doneList = ref<DevTask[]>([]);

function syncAllColumns() {
  const allTasks = [...todoList.value, ...inProgressList.value];

  Promise.all(
    allTasks.map((t) => todoStore.updateTask(t.id, { status: t.status })),
  ).then(() => {
    for (const s of ['todo', 'in-progress'] as const) {
      const list = s === 'todo' ? todoList.value : inProgressList.value;
      const ids = list.map((t) => t.id);
      if (ids.length) todoStore.sortTasks({ status: s, ordered_ids: ids });
    }
  });
}

function makeDragOptions(status: DevTaskStatus) {
  const list = status === 'todo' ? todoList : inProgressList;
  return {
    animation: 300,
    ghostClass: 'opacity-50',
    group: 'devtasks',
    onStart: () => {
      isDragging.value = true;
    },
    onAdd: (evt: DraggableEvent) => {
      const index = evt.newIndex;
      if (index == null) return;
      const moving = list.value[index];
      if (moving && moving.status !== status) {
        moving.status = status;
      }
      syncAllColumns();
    },
    onUpdate: () => {
      syncAllColumns();
    },
    onEnd: () => {
      setTimeout(() => {
        isDragging.value = false;
      }, 500);
    },
  };
}

// Setup-time initialization — ref is resolved by the time drag starts
useDraggable(todoListEl, todoList, makeDragOptions('todo'));
useDraggable(inProgressListEl, inProgressList, makeDragOptions('in-progress'));

onMounted(() => {
  todoStore.hydrateTasks();
});

// Sync from store — skip while dragging to avoid overwriting local mutations
watch(
  [
    () => todoStore.todoItems,
    () => todoStore.inProgressItems,
    () => todoStore.doneItems,
  ],
  ([t, ip, d]) => {
    if (isDragging.value) return;
    todoList.value = t;
    inProgressList.value = ip;
    doneList.value = d;
  },
  { immediate: true },
);

// Quick add
const addingToStatus = ref<string | null>(null);

const handleQuickAdd = (status: DevTaskStatus, title: string) => {
  todoStore.createTask({ title, status });
  addingToStatus.value = null;
};
</script>

<style>
.todo-card-move,
.todo-card-enter-active,
.todo-card-leave-active {
  transition: all 0.3s ease-out;
}
.todo-card-enter-from,
.todo-card-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.todo-card-leave-active {
  position: absolute;
}
.done-expand-enter-active,
.done-expand-leave-active {
  transition:
    opacity 0.2s ease,
    max-height 0.25s ease;
  overflow: hidden;
}
.done-expand-enter-from,
.done-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.done-expand-enter-to,
.done-expand-leave-from {
  max-height: 1000px;
}
</style>
