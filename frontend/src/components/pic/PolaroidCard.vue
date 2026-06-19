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
      rotate: 0,
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
    <!--
      PolaroidCard — 经典拍立得改版
      - 顶部窄白边 12px + 底部宽白边 56px（拍立得标志性比例）
      - 白边颜色 = var(--paper) 跟随 10 套主题
      - 阴影双层，hover 时同步加深
    -->
    <div
      class="polaroid relative flex flex-col rounded-[2px] group"
      :style="{ width: `${size + 24}px` }"
    >
      <!-- 顶部窄白边 + 图片容器 -->
      <div
        class="polaroid-top relative mx-2 overflow-hidden rounded-[1px] mt-3 group-hover:mt-0 group-hover:mx-0 transition-all duration-300"
      >
        <div
          class="polaroid-photo relative w-full overflow-hidden"
          :style="{ height: `${size * aspect}px` }"
        >
          <img
            :src="image.url"
            :alt="image.description"
            class="pointer-events-none h-full w-full object-cover transition-transform duration-700 ease-out"
            loading="lazy"
            draggable="false"
          />

          <!-- Hover 胶片闪光点：克制的中央白点，不遮挡画面 -->
          <div
            class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          >
            <div
              class="translate-y-2 rounded-full bg-white/70 p-2.5 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-white/30"
            >
              <Maximize2 class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <!-- 底部宽白边：拍立得标志性"留白写字区" -->
      <div
        class="polaroid-bottom relative flex items-center justify-center"
        :style="{ height: '56px', paddingBottom: '12px' }"
      >
        <span class="polaroid-date select-none font-family-averia">
          {{ dateLabel }}
        </span>
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

// 拍立得底部日期：若图片有 takenAt / createdAt / date 字段则显示，否则留空槽
const dateLabel = computed(() => {
  const raw =
    (props.image as any).uploadedAt ??
    (props.image as any).createdAt ??
    (props.image as any).date ??
    null;
  if (!raw) return '— —';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return '— —';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}.${m}`;
});

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

<style scoped>
/* ============================================================
   Polaroid — 跟随 10 套主题 token
   白边 = var(--paper)        暖色滤镜模拟胶片
   阴影  = color-mix(--ink)   浅色主题是柔灰、深色主题是柔黑
   ============================================================ */
.polaroid {
  background: var(--paper);
  box-shadow:
    0 1px 1px color-mix(in oklch, var(--ink) 6%, transparent),
    0 6px 14px color-mix(in oklch, var(--ink) 10%, transparent),
    0 18px 32px color-mix(in oklch, var(--ink) 8%, transparent);
  transition:
    transform 0.25s ease,
    box-shadow 0.3s ease;
  will-change: transform, box-shadow;
}

.polaroid:hover {
  box-shadow:
    0 2px 2px color-mix(in oklch, var(--ink) 8%, transparent),
    0 12px 24px color-mix(in oklch, var(--ink) 18%, transparent),
    0 28px 48px color-mix(in oklch, var(--ink) 14%, transparent);
}

.polaroid-top {
  background: var(--paper);
}

.polaroid-photo {
  background: var(--warm-gray);
  /* 图片区上下加 1px 极细描边模拟胶片曝光边缘 */
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--ink) 8%, transparent);
}

.polaroid-bottom {
  background: var(--paper);
}

.polaroid-date {
  font-size: 15px;
  letter-spacing: 0.04em;
  color: color-mix(in oklch, var(--ink) 55%, transparent);
}

/* 极轻的胶片颗粒感：浅色主题叠 1% 暗度（泛黄），深色主题叠 1% 亮度（泛蓝）。
   不影响图片本身的颜色，只在白边上微微泛黄/泛蓝。 */
.polaroid::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: color-mix(in oklch, var(--ink) 2%, transparent);
  mix-blend-mode: multiply;
  z-index: 1;
}

:global(.dark) .polaroid::before {
  background: color-mix(in oklch, var(--paper) 3%, transparent);
  mix-blend-mode: screen;
}
</style>
