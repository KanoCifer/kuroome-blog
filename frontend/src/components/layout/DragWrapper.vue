<template>
  <div
    :style="[position]"
    class="drag-wrapper absolute -translate-x-1/2 -translate-y-1/2 transition-[border] duration-200"
    :class="{
      'outline-primary/60 rounded-3xl outline-2 outline-offset-8 outline-dashed':
        layoutStore.isEditing,
      'cursor-grab': layoutStore.isEditing,
    }"
    @pointerdown="onPointerDown"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useCardDrag } from '@/composables/card';
import { useCardLayoutStore } from '@/stores/cardLayout';
import type { CSSProperties } from 'vue';

const props = defineProps<{
  cardName: string;
  position: CSSProperties;
}>();

const layoutStore = useCardLayoutStore();
const drag = useCardDrag();

function onPointerDown(e: PointerEvent) {
  const el =
    (e.currentTarget as HTMLElement) ??
    ((e.target as HTMLElement).closest('.drag-wrapper') as HTMLElement);
  if (el) drag.onCardPointerDown(e, props.cardName, el);
}
</script>
