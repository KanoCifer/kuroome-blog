<template>
  <transition v-bind="mergedAttrs">
    <slot />
  </transition>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

// 垂直方向 slide+fade：opacity + translate-y-1
// 默认：200ms in / 150ms out，ease-out；含 motion-reduce 守卫。
// 调用方可通过同名 attr 覆盖任一阶段 class。

defineOptions({ name: 'SlideFadeTransition', inheritAttrs: false });

const attrs = useAttrs();

const mergedAttrs = computed(() => ({
  'enter-active-class':
    'transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-0',
  'enter-from-class': 'opacity-0 translate-y-1',
  'enter-to-class': 'opacity-100 translate-y-0',
  'leave-active-class':
    'transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:duration-0',
  'leave-from-class': 'opacity-100 translate-y-0',
  'leave-to-class': 'opacity-0 -translate-y-1',
  ...attrs,
}));
</script>