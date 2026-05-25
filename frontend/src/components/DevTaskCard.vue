<template>
  <div
    class="bg-card border-border/60 hover:border-border group relative rounded-xl border p-3.5 shadow-sm transition-all duration-200 hover:shadow-md"
  >
    <!-- Edit mode -->
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
          class="border-border bg-card text-foreground cursor-pointer rounded-md border px-2 py-1 text-xs outline-none"
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <input
          type="date"
          v-model="editForm.dueDate"
          class="border-border bg-card text-foreground cursor-pointer rounded-md border px-2 py-1 text-xs outline-none"
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

    <!-- View mode -->
    <div v-else class="flex items-start gap-2.5">
      <!-- Status badge with color transition -->
      <button
        class="mt-0.5 shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-300 ease-out"
        :style="statusStyle"
        @click="$emit('cycleStatus', task.id)"
      >
        {{ STATUS_LABELS[task.status] }}
      </button>

      <div class="min-w-0 flex-1">
        <p
          class="text-sm font-medium leading-snug wrap-break-word"
          :class="[
            task.status === 'done'
              ? 'text-muted-foreground line-through'
              : 'text-foreground',
          ]"
        >
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
            :class="priorityBadgeClass(task.priority)"
          >
            {{ priorityLabel(task.priority) }}
          </span>
          <span
            v-if="task.dueDate"
            class="text-muted-foreground flex items-center gap-1 text-[10px]"
            :class="{
              'text-red-600 dark:text-red-400':
                isOverdue(task.dueDate) && task.status !== 'done',
            }"
          >
            <svg
              class="h-2.5 w-2.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
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

      <!-- Actions -->
      <slot name="actions">
        <div
          class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <button
            @click="startEdit"
            class="text-muted-foreground hover:bg-accent hover:text-primary cursor-pointer rounded-md p-1 transition-colors"
            title="编辑"
          >
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            @click="$emit('deleteTask', task.id)"
            class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md p-1 transition-colors"
            title="删除"
          >
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
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
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DevTask, DevTaskPriority, DevTaskStatus } from "@/service/todoService/types";
import { STATUS_LABELS } from "@/stores/todos";
import { computed, ref } from "vue";

const props = defineProps<{ task: DevTask }>();

const emit = defineEmits<{
  cycleStatus: [id: string];
  deleteTask: [id: string];
  updateTask: [id: string, patch: Partial<DevTask>];
}>();

// Internal edit state
const isEditing = ref(false);
const editForm = ref({
  title: "",
  description: "",
  dueDate: "",
  priority: "medium" as DevTaskPriority,
});

function startEdit() {
  isEditing.value = true;
  editForm.value = {
    title: props.task.title,
    description: props.task.description || "",
    dueDate: props.task.dueDate || "",
    priority: props.task.priority || "medium",
  };
}

function saveEdit() {
  if (!editForm.value.title.trim()) return;
  emit("updateTask", props.task.id, {
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

// Status badge style
const statusStyle = computed(() => {
  const colors: Record<DevTaskStatus, { bg: string; border: string; text: string }> = {
    todo: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    "in-progress": { bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
    done: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  };
  const c = colors[props.task.status];
  return {
    backgroundColor: c.bg,
    borderColor: c.border,
    color: c.text,
  };
});

function priorityLabel(p: DevTaskPriority): string {
  return { low: "低", medium: "中", high: "高" }[p];
}

function priorityBadgeClass(p: DevTaskPriority): string {
  const map: Record<DevTaskPriority, string> = {
    low: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    medium:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    high: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[p];
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}
</script>
