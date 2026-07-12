<template>
  <div class="bg-background h-full min-h-screen w-full">
    <div class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">
      <!-- 页头：标题 + 一键新建 -->
      <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-foreground text-2xl font-semibold tracking-tight">
            开发任务
          </h1>
          <p class="text-muted-foreground mt-0.5 text-sm">
            网站开发需求与实现清单
          </p>
        </div>
        <button
          @click="openCreate('待评估')"
          class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
          新建任务
        </button>
      </header>

      <!-- 看板：移动端水平滚动，大屏等宽 -->
      <div
        class="bg-muted/20 border-border/50 flex gap-3 overflow-x-auto rounded-xl border p-3 lg:gap-4 lg:overflow-x-visible lg:p-4"
      >
        <KanbanColumn
          v-for="status in store.V3_STATUSES"
          :key="status"
          :status="status"
          :title="status"
          :tasks="store.tasksByStatus(status)"
          @quick-add="openCreate"
          @cycle-status="store.cycleStatus"
          @edit="openEdit"
          @delete="handleDelete"
          @drop-reorder="handleDropReorder"
        />
      </div>

      <!-- 编辑/新建弹窗 -->
      <DevTaskModal
        :open="modalOpen"
        :task="editingTask"
        @close="modalOpen = false"
        @save-create="handleCreate"
        @save-update="handleUpdate"
        @hard-delete="handleHardDelete"
      />

      <!-- 软删除确认（卡片 × 按钮触发） -->
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
  </div>
</template>

<script setup lang="ts">
import KanbanColumn from './components/KanbanColumn.vue';
import DevTaskModal from './components/DevTaskModal.vue';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useV3DevTaskStore } from '@/stores/v3devtasks';
import type { DevTask, DevTaskStatus } from '@/api/devtask';
import { onMounted, ref } from 'vue';

const store = useV3DevTaskStore();

// Modal state
const modalOpen = ref(false);
const editingTask = ref<DevTask | null>(null);

function openCreate(status: string) {
  editingTask.value = null;
  modalOpen.value = true;
}

function openEdit(id: string) {
  editingTask.value = store.tasks.find((t) => t.id === id) ?? null;
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

async function handleHardDelete(id: string) {
  await store.hardDeleteTask(id);
  modalOpen.value = false;
}

async function handleDropReorder(payload: {
  status: DevTaskStatus;
  orderedIds: string[];
}) {
  await store.syncColumn(payload.status, payload.orderedIds);
}

onMounted(() => {
  store.fetchTasks();
});
</script>
