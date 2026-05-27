<template>
  <BasicDetail title="开发任务" subtitle="网站开发需求和实现清单">
    <div class="col-span-full mx-auto w-full max-w-7xl px-4">
      <!-- Board -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <!-- 待办 -->
        <TodoColumn
          status="todo"
          title="待办"
          :tasks-count="todoList.length"
          bg="bg-blue-50 dark:bg-blue-950"
          dot="bg-blue-500"
          :adding-to-status="addingToStatus"
          @start-add="addingToStatus = $event"
          @submit-quick-add="handleQuickAdd('todo', $event)"
          @cancel-quick-add="addingToStatus = null"
        >
          <TransitionGroup
            v-draggable="[todoList, dragTodo]"
            tag="ul"
            class="space-y-3"
            type="transition"
            :name="!dragging ? 'todo-card' : undefined"
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
          bg="bg-amber-50 dark:bg-amber-950"
          dot="bg-amber-500"
          :adding-to-status="addingToStatus"
          @start-add="addingToStatus = $event"
          @submit-quick-add="handleQuickAdd('in-progress', $event)"
          @cancel-quick-add="addingToStatus = null"
        >
          <TransitionGroup
            v-draggable="[inProgressList, dragInProgress]"
            tag="ul"
            class="space-y-3"
            type="transition"
            :name="!dragging ? 'todo-card' : undefined"
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

        <!-- 已完成 -->
        <TodoColumn
          status="done"
          title="已完成"
          :tasks-count="doneList.length"
          bg="bg-emerald-50 dark:bg-emerald-950"
          dot="bg-emerald-500"
          :adding-to-status="addingToStatus"
          @start-add="addingToStatus = $event"
          @submit-quick-add="handleQuickAdd('done', $event)"
          @cancel-quick-add="addingToStatus = null"
        >
          <TransitionGroup
            v-draggable="[doneList, dragDone]"
            tag="ul"
            class="space-y-3"
            type="transition"
            :name="!dragging ? 'todo-card' : undefined"
          >
            <DevTaskCard
              v-for="task in doneList"
              :key="task.id"
              :task="task"
              @cycle-status="todoStore.cycleStatus"
              @delete-task="todoStore.deleteTask"
              @update-task="(id, patch) => todoStore.updateTask(id, patch)"
            />
            <li
              v-if="doneList.length === 0"
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
import type { DevTask, DevTaskStatus } from '@/service/todoService/types';
import { useTodoStore } from '@/stores/todos';
import { vDraggable } from 'vue-draggable-plus';
import { nextTick, onMounted, ref, watch } from 'vue';

const todoStore = useTodoStore();

const dragging = ref(false);

function createDragOptions(status: string) {
  const listRef = (): typeof todoList.value => {
    const m: Record<string, typeof todoList.value> = {
      todo: todoList.value,
      'in-progress': inProgressList.value,
      done: doneList.value,
    };
    return m[status];
  };

  const reorder = () => {
    const ids = listRef().map((t: DevTask) => t.id);
    todoStore.sortTasks({ status, ordered_ids: ids });
  };

  return {
    animation: 300,
    ghostClass: 'opacity-50',
    group: 'devtasks',
    onStart: () => {
      dragging.value = true;
    },
    onUpdate: reorder,
    onAdd: (evt: any) => {
      const item = listRef()[evt.newIndex];
      if (item && item.status !== status) {
        item.status = status as DevTaskStatus;
        todoStore.updateTask(item.id, { status: status as DevTaskStatus });
      }
      reorder();
    },
    onEnd: () => {
      nextTick(() => {
        dragging.value = false;
      });
    },
  };
}

const dragTodo = createDragOptions('todo');
const dragInProgress = createDragOptions('in-progress');
const dragDone = createDragOptions('done');

// Writable local copies for drag-and-drop, synced from store via watcher
const todoList = ref<DevTask[]>([]);
const inProgressList = ref<DevTask[]>([]);
const doneList = ref<DevTask[]>([]);

onMounted(() => {
  todoStore.hydrateTasks();
});

// Sync local drag refs from store — fires on initial load and after every create/delete/update
watch(
  [
    () => todoStore.todoItems,
    () => todoStore.inProgressItems,
    () => todoStore.doneItems,
  ],
  ([t, ip, d]) => {
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
</style>
