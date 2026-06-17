<script setup lang="ts">
/**
 * 文学手账风 mini-window：hover ~400ms 弹出，自渲染精简状态卡。
 * 用 Vue 计时器 + Teleport 实现：
 *  - 鼠标进入 trigger 区域后 openDelay 毫秒才显示浮层
 *  - 鼠标离开时 closeDelay 毫秒后收起（允许鼠标从 trigger 移到浮层）
 *  - 浮层在 trigger 之上（bottom）、靠右（end）对齐
 */
import { onBeforeUnmount, ref, useTemplateRef } from 'vue';
import { useElementBounding, useEventListener } from '@vueuse/core';
import StatusMini from './StatusMini.vue';
import { useVisitorCountStore } from '@/stores/visitorCount';

const visitorCount = useVisitorCountStore();

const open = ref(false);
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const popoverRef = useTemplateRef<HTMLElement>('popoverRef');

const triggerBox = useElementBounding(triggerRef);
const popoverBox = useElementBounding(popoverRef);

const OFFSET = 8;
const COLLISION = 12;

const popoverStyle = ref<Record<string, string>>({});

function updatePosition() {
  const t = triggerRef.value;
  if (!t) return;
  const winW = window.innerWidth;
  const tRect = t.getBoundingClientRect();
  // 宽度预设 420px（与原 reka-ui 版一致）
  const w = 420;
  // 默认 top: trigger 上方，end: 右侧贴齐 trigger 右边
  const ph: number = popoverBox.height.value || 0;
  let top = tRect.top - OFFSET - ph;
  // 上方空间不够则改到下方
  if (top < COLLISION) {
    top = tRect.bottom + OFFSET;
  }
  let left = tRect.right - w;
  if (left < COLLISION) left = COLLISION;
  if (left + w > winW - COLLISION) left = winW - COLLISION - w;
  popoverStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${w}px`,
    zIndex: '100',
  };
}

let openTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function scheduleOpen() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (open.value) return;
  openTimer = setTimeout(() => {
    open.value = true;
    requestAnimationFrame(updatePosition);
  }, 400);
}

function scheduleClose() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  closeTimer = setTimeout(() => {
    open.value = false;
  }, 150);
}

useEventListener(window, 'scroll', () => open.value && updatePosition(), { passive: true });
useEventListener(window, 'resize', () => open.value && updatePosition());

onBeforeUnmount(() => clearTimers());
</script>

<template>
  <span
    ref="triggerRef"
    class="inline-flex"
    @mouseenter="scheduleOpen"
    @mouseleave="scheduleClose"
    @focusin="scheduleOpen"
    @focusout="scheduleClose"
  >
    <slot name="trigger" />
  </span>

  <Teleport to="body">
    <div
      v-if="open"
      ref="popoverRef"
      role="dialog"
      aria-label="Service Status"
      data-state="open"
      :style="popoverStyle"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg outline-none"
      @mouseenter="scheduleOpen"
      @mouseleave="scheduleClose"
    >
      <div
        class="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 border-border/60 overflow-hidden rounded-lg border shadow-xl backdrop-blur-md"
      >
        <header
          class="border-border/40 bg-muted/30 flex items-center gap-2.5 border-b px-3 py-2"
        >
          <div class="flex items-center gap-1">
            <span class="h-2 w-2 rounded-full bg-red-400/70" />
            <span class="h-2 w-2 rounded-full bg-yellow-400/70" />
            <span class="h-2 w-2 rounded-full bg-emerald-400/70" />
          </div>
          <span
            class="text-foreground/80 font-serif text-[12px] tracking-wide italic"
            >Service Status</span
          >
          <span
            class="text-muted-foreground/60 ml-auto font-mono text-[10px] tracking-[0.1em] lowercase"
            >/status</span
          >
        </header>

        <StatusMini />

        <footer
          class="border-border/40 text-muted-foreground/70 flex items-center justify-between border-t px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] uppercase"
        >
          <span>live preview</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="bg-success h-1 w-1 rounded-full" />
            <span>{{ visitorCount.count }} online</span>
          </span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
