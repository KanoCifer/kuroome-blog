<script setup lang="ts">
/**
 * 确认按钮。点击时先 emit，让父级决定行为；emit 之后自动关闭弹窗。
 */
import type { HTMLAttributes } from 'vue';
import { inject } from 'vue';

const setOpen = inject<(v: boolean) => void>('alertDialog.setOpen', () => {});

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void;
}>();

defineOptions({
  name: 'UiAlertDialogAction',
});

function onClick(e: MouseEvent) {
  emit('click', e);
  setOpen(false);
}
</script>

<template>
  <button
    data-slot="alert-dialog-action"
    type="button"
    :class="['inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none disabled:pointer-events-none disabled:opacity-50', props.class]"
    @click="onClick"
  >
    <slot />
  </button>
</template>
