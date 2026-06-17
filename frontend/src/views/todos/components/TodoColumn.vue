<template>
  <div
    class="flex max-h-[80vh] min-h-[60vh] flex-col rounded-[2rem] p-5 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg"
    :class="bg"
  >
    <!-- Column header -->
    <div class="mb-4 flex shrink-0 items-center gap-2">
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="dot"></span>
      <h3 class="text-foreground text-sm font-semibold">
        {{ title }}
      </h3>
      <span
        class="text-muted-foreground rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/10"
      >
        {{ tasksCount }}
      </span>
    </div>

    <!-- Task cards -->
    <div class="max-h-[50vh] flex-1 space-y-3 overflow-y-auto">
      <slot />
    </div>

    <!-- Quick add -->
    <div class="border-border/50 mt-3 shrink-0 border-t pt-3">
      <button
        v-if="addingToStatus !== status"
        @click="$emit('startAdd', status)"
        class="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors"
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
        添加
      </button>
      <div v-else class="space-y-2">
        <input
          v-model="quickTitle"
          ref="inputRef"
          type="text"
          :placeholder="`添加${title}任务...`"
          class="border-border bg-card focus:border-primary text-foreground w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          @keyup.enter="submit"
          @keyup.escape="$emit('cancelQuickAdd')"
        />
        <div class="flex items-center gap-1.5">
          <button
            @click="$emit('cancelQuickAdd')"
            class="text-muted-foreground hover:bg-accent cursor-pointer rounded-md px-2 py-1 text-xs transition-colors"
          >
            取消
          </button>
          <button
            @click="submit"
            :disabled="!quickTitle.trim()"
            class="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
  status: string;
  title: string;
  tasksCount: number;
  bg: string;
  dot: string;
  addingToStatus: string | null;
}>();

const emit = defineEmits<{
  startAdd: [status: string];
  submitQuickAdd: [title: string];
  cancelQuickAdd: [];
}>();

const quickTitle = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({ focus: () => inputRef.value?.focus() });

const submit = () => {
  const title = quickTitle.value.trim();
  if (!title) return;
  emit('submitQuickAdd', title);
  quickTitle.value = '';
};
</script>
