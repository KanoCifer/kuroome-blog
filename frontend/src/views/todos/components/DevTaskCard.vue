<template>
  <li
    class="group relative rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
    :class="[
      isEditing ? '' : 'hover:bg-white/80 dark:hover:bg-white/5',
      'border border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-black/20',
    ]"
  >
    <!-- ── Edit mode (shared) ── -->
    <div v-if="isEditing" class="space-y-2.5">
      <input
        v-model="editForm.title"
        class="border-border bg-card focus:border-primary text-foreground w-full rounded-lg border px-2.5 py-1.5 text-sm font-medium outline-none"
      />
      <textarea
        v-model="editForm.description"
        rows="2"
        class="focus:border-primary border-border bg-card text-foreground w-full resize-none rounded-lg border px-2.5 py-1.5 text-xs outline-none"
        placeholder="描述..."
      ></textarea>
      <div class="flex items-center gap-2">
        <select
          v-model="editForm.priority"
          class="border-border bg-card text-foreground cursor-pointer rounded-full border px-2 py-1 text-xs outline-none"
        >
          <option value="default">默认</option>
          <option value="low">低</option>
          <option value="high">高</option>
        </select>
        <input
          type="date"
          v-model="editForm.dueDate"
          class="border-border bg-card text-foreground cursor-pointer rounded-full border px-2 py-1 text-xs outline-none"
        />
        <div class="ml-auto flex gap-1.5">
          <button
            @click="cancelEdit"
            class="bg-muted text-foreground hover:bg-accent cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
          >
            取消
          </button>
          <button
            @click="saveEdit"
            class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- ── Todo 卡片 ── -->
    <div v-else-if="task.status === 'todo'" class="flex items-start gap-2.5">
      <button
        class="mt-0.5 shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-medium"
        style="background: #eff6ff; color: #1d4ed8"
        @click="$emit('cycleStatus', task.id)"
      >
        {{ STATUS_LABELS.todo }}
      </button>

      <div class="min-w-0 flex-1">
        <p class="text-foreground text-sm leading-snug font-medium">
          {{ task.title }}
        </p>
        <p
          v-if="task.description"
          class="text-muted-foreground mt-1 line-clamp-2 text-xs"
        >
          {{ task.description }}
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            class="rounded-full border px-1.5 py-px text-[10px] font-medium"
            :class="priorityCls(task.priority)"
          >
            {{ priorityLabel(task.priority) }}
          </span>
          <span
            v-if="task.dueDate"
            class="text-muted-foreground flex items-center gap-1 text-[10px]"
            :class="overdueCls(task.dueDate)"
          >
            <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd"
              />
            </svg>
            {{ task.dueDate }}
          </span>
        </div>
      </div>

      <ActionsSlot
        @start-edit="startEdit"
        @delete="emit('deleteTask', task.id)"
      />
    </div>

    <!-- ── In-Progress 卡片 ── -->
    <div
      v-else-if="task.status === 'in-progress'"
      class="flex items-start gap-2.5"
    >
      <button
        class="mt-0.5 shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-medium"
        style="background: #fffbeb; color: #b45309"
        @click="$emit('cycleStatus', task.id)"
      >
        {{ STATUS_LABELS['in-progress'] }}
      </button>

      <div class="min-w-0 flex-1">
        <p class="text-foreground text-sm leading-snug font-medium">
          {{ task.title }}
        </p>
        <p
          v-if="task.description"
          class="text-muted-foreground mt-1 line-clamp-2 text-xs"
        >
          {{ task.description }}
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            class="rounded-full border px-1.5 py-px text-[10px] font-medium"
            :class="priorityCls(task.priority)"
          >
            {{ priorityLabel(task.priority) }}
          </span>
          <span
            v-if="task.dueDate"
            class="text-muted-foreground flex items-center gap-1 text-[10px]"
            :class="overdueCls(task.dueDate)"
          >
            <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd"
              />
            </svg>
            {{ task.dueDate }}
          </span>
        </div>
      </div>

      <ActionsSlot
        @start-edit="startEdit"
        @delete="emit('deleteTask', task.id)"
      />
    </div>

    <!-- ── Done 卡片 ── -->
    <div v-else class="flex items-start gap-2.5">
      <button
        class="mt-0.5 shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-medium"
        style="background: #ecfdf5; color: #047857"
        @click="$emit('cycleStatus', task.id)"
      >
        {{ STATUS_LABELS.done }}
      </button>

      <div class="min-w-0 flex-1">
        <p
          class="text-muted-foreground text-sm leading-snug font-medium line-through"
        >
          {{ task.title }}
        </p>
        <p
          v-if="task.description"
          class="text-muted-foreground mt-1 line-clamp-2 text-xs opacity-60"
        >
          {{ task.description }}
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            class="rounded-full border px-1.5 py-px text-[10px] font-medium"
            :class="priorityCls(task.priority)"
          >
            {{ priorityLabel(task.priority) }}
          </span>
          <span
            v-if="task.dueDate"
            class="text-muted-foreground flex items-center gap-1 text-[10px]"
          >
            <svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clip-rule="evenodd"
              />
            </svg>
            {{ task.dueDate }}
          </span>
        </div>
      </div>

      <ActionsSlot
        @start-edit="startEdit"
        @delete="emit('deleteTask', task.id)"
      />
    </div>
  </li>
</template>

<script setup lang="ts">
import type { DevTask, DevTaskPriority } from '@/service/todoService/types';
import { STATUS_LABELS } from '@/stores/todos';
import { ref } from 'vue';
import ActionsSlot from './DevTaskCardActions.vue';

const props = defineProps<{ task: DevTask }>();

const emit = defineEmits<{
  cycleStatus: [id: string];
  deleteTask: [id: string];
  updateTask: [id: string, patch: Partial<DevTask>];
}>();

// Edit state
const isEditing = ref(false);
const editForm = ref({
  title: '',
  description: '',
  dueDate: '',
  priority: 'default' as DevTaskPriority,
});

function startEdit() {
  isEditing.value = true;
  editForm.value = {
    title: props.task.title,
    description: props.task.description || '',
    dueDate: props.task.dueDate || '',
    priority: props.task.priority || 'default',
  };
}

function saveEdit() {
  if (!editForm.value.title.trim()) return;
  emit('updateTask', props.task.id, {
    title: editForm.value.title.trim(),
    description: editForm.value.description.trim() || undefined,
    dueDate: editForm.value.dueDate || undefined,
    priority: editForm.value.priority,
  });
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}

// Priority helpers (kept as tiny fns to avoid repeating 3× in template)
const PRIORITY_LABEL: Record<DevTaskPriority, string> = {
  low: '低',
  high: '高',
  default: '默认',
};
const PRIORITY_CLASS: Record<DevTaskPriority, string> = {
  low: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
  default:
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
};

function priorityLabel(p: DevTaskPriority): string {
  return PRIORITY_LABEL[p];
}
function priorityCls(p: DevTaskPriority): string {
  return PRIORITY_CLASS[p];
}
function overdueCls(dateStr?: string): string {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today ? 'text-red-600 dark:text-red-400' : '';
}
</script>
