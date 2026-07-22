<!--
  BookShelfStateView — 书架的 "尚未就绪" 三态视图

  封装 BookShelf 的 loading / error / empty 三种状态,避免主页面被
  大量条件分支的占位结构淹没。ready 状态下本组件不渲染任何内容,
  由父级自行展示真实书架。

  Props:
    isLoading      加载中 → 显示 8 卡骨架屏 + 顶栏占位
    errorMessage   错误信息(非空字符串 → 显示错误卡片)
    isEmpty        书架为空 → 显示空状态卡片
    hideRetry      隐藏错误卡片的默认重试按钮(若父级用 error-action slot 自定义)

  Emits:
    retry          用户点击 "重试" 时触发(默认错误卡片才有)

  Slots:
    error-action   覆盖错误卡片的操作区(传 retry 给默认实现)
    empty-action   在空状态文案下方追加 CTA(可选)
-->
<template>
  <!-- Loading skeleton -->
  <div v-if="isLoading" data-testid="shelf-state-loading">
    <div class="bg-muted mb-4 h-9 w-full animate-pulse rounded-xl" />
    <div
      class="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      <div
        v-for="i in 8"
        :key="i"
        class="animate-pulse"
        :style="{
          animationDelay: `${(i - 1) * 60}ms`,
          animationFillMode: 'backwards',
        }"
      >
        <div class="bg-muted aspect-3/4 rounded-xl" />
        <div class="mt-2 space-y-1.5 px-1.5">
          <div class="bg-muted h-3 w-5/6 rounded" />
          <div class="bg-muted h-3 w-3/4 rounded" />
          <div class="bg-muted h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="errorMessage"
    data-testid="shelf-state-error"
    class="flex justify-center py-12"
  >
    <div
      class="bg-paper border-border w-full max-w-md rounded-2xl border p-8 text-center shadow-sm"
    >
      <div
        class="bg-destructive/10 text-destructive mx-auto mb-5 flex size-12 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3 class="text-ink font-serif text-xl font-bold">书架加载失败</h3>
      <p class="text-muted mt-2 text-sm">
        {{ errorMessage }}
      </p>
      <div class="mt-6 flex justify-center">
        <slot name="error-action" :retry="retry">
          <Button
            v-if="!hideRetry"
            variant="outline"
            class="min-w-28"
            @click="retry"
          >
            <RotateCcw class="h-3.5 w-3.5" />
            重试
          </Button>
        </slot>
      </div>
    </div>
  </div>

  <!-- Empty shelf -->
  <div
    v-else-if="isEmpty"
    data-testid="shelf-state-empty"
    class="flex justify-center py-12"
  >
    <div
      class="bg-paper border-border w-full max-w-md rounded-2xl border p-10 text-center"
    >
      <svg
        viewBox="0 0 88 64"
        class="text-muted/50 mx-auto mb-6 h-20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- shelf top + bottom rails -->
        <line x1="4" y1="4" x2="84" y2="4" />
        <line x1="4" y1="60" x2="84" y2="60" />
        <!-- a few books clustered on the left, plenty of empty space -->
        <rect x="10" y="18" width="8" height="42" rx="1.2" />
        <rect
          x="22"
          y="12"
          width="10"
          height="48"
          rx="1.2"
          transform="rotate(-2 27 36)"
        />
        <rect x="36" y="22" width="8" height="38" rx="1.2" />
        <line x1="40" y1="30" x2="40" y2="36" />
        <!-- a single book on the right to emphasize the gap -->
        <rect x="68" y="16" width="10" height="44" rx="1.2" />
      </svg>
      <h3 class="text-ink font-serif text-xl font-bold">暂无书籍</h3>
      <p class="text-muted mt-2 text-sm">你的微信读书书架还是空的</p>
      <div v-if="$slots['empty-action']" class="mt-6 flex justify-center">
        <slot name="empty-action" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components';
import { RotateCcw } from '@lucide/vue';

withDefaults(
  defineProps<{
    isLoading: boolean;
    errorMessage: string;
    isEmpty: boolean;
    hideRetry?: boolean;
  }>(),
  {
    hideRetry: false,
  },
);

const emit = defineEmits<{
  (e: 'retry'): void;
}>();

function retry() {
  emit('retry');
}
</script>
