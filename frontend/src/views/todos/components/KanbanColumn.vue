<template>
  <div
    class="bg-background border-border/60 flex w-72 shrink-0 flex-col rounded-xl border lg:w-auto lg:min-w-0 lg:basis-0 lg:flex-1"
  >
    <!-- 列头 -->
    <div class="flex items-center gap-2 px-3.5 py-3">
      <h3 class="text-foreground text-sm font-semibold">{{ title }}</h3>
      <span
        class="text-muted-foreground rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
      >
        {{ localTasks.length }}
      </span>
      <button
        @click="$emit('quickAdd', status)"
        class="text-muted-foreground hover:bg-muted hover:text-foreground ml-auto cursor-pointer rounded-md p-1 transition-colors"
        title="添加任务"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>

    <!-- 卡片列表（拖拽目标） -->
    <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <TransitionGroup
        ref="listEl"
        tag="ul"
        class="space-y-2"
        type="transition"
        name="card"
      >
        <DevTaskCard
          v-for="task in localTasks"
          :key="task.id"
          :task="task"
          @cycle-status="$emit('cycleStatus', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </TransitionGroup>
      <li
        v-if="localTasks.length === 0"
        class="text-muted-foreground/60 flex items-center justify-center py-10 text-xs"
      >
        暂无任务
      </li>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDraggable, type DraggableEvent } from 'vue-draggable-plus';
import type { DevTask, DevTaskStatus } from '@/api/devtask';
import DevTaskCard from './DevTaskCard.vue';

const props = defineProps<{
  status: DevTaskStatus;
  title: string;
  tasks: DevTask[];
}>();

const emit = defineEmits<{
  quickAdd: [status: DevTaskStatus];
  cycleStatus: [id: string];
  edit: [id: string];
  delete: [id: string];
  dropReorder: [{ status: DevTaskStatus; orderedIds: string[] }];
}>();

// 本地响应式副本：拖拽时即时反映顺序变化，props 变化时重置
const localTasks = ref<DevTask[]>([...props.tasks]);
watch(
  () => props.tasks,
  (val) => {
    localTasks.value = [...val];
  },
);

const listEl = ref<HTMLElement | null>(null);

useDraggable(listEl, localTasks, {
  animation: 200,
  ghostClass: 'opacity-40',
  group: { name: 'v3-devtasks', pull: true, put: true },
  onAdd(evt: DraggableEvent) {
    const index = evt.newIndex;
    if (index == null) return;
    const moving = localTasks.value[index];
    if (moving && moving.status !== props.status) {
      moving.status = props.status;
    }
  },
  onEnd() {
    emit('dropReorder', {
      status: props.status,
      orderedIds: localTasks.value.map((t) => t.id),
    });
  },
});
</script>

<style scoped>
.card-move,
.card-enter-active,
.card-leave-active {
  transition: all 0.25s ease-out;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.card-leave-active {
  position: absolute;
}
</style>
