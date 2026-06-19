<template>
  <motion.div
    class="absolute origin-center"
    :class="isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'"
    :style="layoutStyle"
    :initial="{
      opacity: 0,
      scale: 0.8,
      rotate: rotation - 10,
      y: 50,
    }"
    :animate="{ opacity: 1, scale: 1, rotate: rotation, y: 0 }"
    :transition="{
      duration: 0.8,
      delay: index * 0.04,
      type: 'spring',
      stiffness: 260,
      damping: 20,
    }"
    :whileHover="{
      scale: 1.05,
      zIndex: 100,
      transition: { duration: 0.2 },
    }"
    :whileDrag="
      isDraggable
        ? {
            scale: 1.1,
            zIndex: 150,
            rotate: 0,
            cursor: 'grabbing',
            transition: { type: 'spring', stiffness: 400, damping: 25 },
          }
        : undefined
    "
    :whileTap="{
      scale: 1.05,
      cursor: isDraggable ? 'grabbing' : 'pointer',
    }"
    drag
    :drag-constraints="constraints"
    :drag-elastic="0.2"
    :drag-momentum="false"
    @dragstart="$emit('dragstart', index)"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <!-- Polaroid Frame -->
    <div
      class="group bg-background ring-border/5 relative flex flex-col items-center rounded-sm p-2 shadow-xl ring-1 transition-shadow hover:shadow-2xl sm:p-3"
      :style="{ width: `${size + 24}px` }"
    >
      <div
        class="bg-muted relative w-full overflow-hidden rounded-sm"
        :style="{ height: `${size * aspect}px` }"
      >
        <img
          :src="image.url"
          :alt="image.description"
          class="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          draggable="false"
        />

        <!-- Hover Overlay icon -->
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <div
            class="translate-y-4 transform rounded-full bg-white/20 p-3 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Maximize2 class="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
</template>

<script setup lang="ts">
import { Maximize2 } from '@lucide/vue';
import { motion } from 'motion-v';
import { computed, ref } from 'vue';
import type { Picture } from '@/composables/pic';

const props = defineProps<{
  image: Picture;
  index: number;
  size: number;
  aspect: number;
  rotation: number;
  layoutStyle: Record<string, string | number>;
  isDraggable: boolean;
  dragConstraints: HTMLElement | null;
}>();

// motion-v's dragConstraints accepts an element ref; null is tolerated at runtime
const constraints = computed(() => props.dragConstraints ?? undefined);

const emit = defineEmits<{
  select: [image: Picture, index: number];
  dragstart: [index: number];
}>();

// Drag/click disambiguation: treat pointer moves >5px as drag, not click
const dragStartPos = ref({ x: 0, y: 0 });

const onPointerDown = (e: PointerEvent) => {
  dragStartPos.value = { x: e.clientX, y: e.clientY };
};

const onClick = (e: MouseEvent) => {
  const dx = Math.abs(e.clientX - dragStartPos.value.x);
  const dy = Math.abs(e.clientY - dragStartPos.value.y);

  if (dx > 5 || dy > 5) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  emit('select', props.image, props.index);
};
</script>
