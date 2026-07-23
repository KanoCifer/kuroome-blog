<template>
  <motion.article
    :initial="{ opacity: 0, y: 16 }"
    :whileInView="WHILE_IN_VIEW_FADE_UP"
    :viewport="{ once: true, margin: '-40px' }"
    :transition="{ type: 'spring', stiffness: 280, damping: 24 }"
    class="relative"
  >
    <div
      role="button"
      tabindex="0"
      :class="[
        'group relative block cursor-pointer overflow-hidden rounded-2xl border px-5 py-5 shadow-sm transition-all duration-300 ease-out focus-visible:outline-none',
        'hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
        moment.is_pinned
          ? 'bg-warning/8 border-warning/30'
          : 'bg-page border-border/40 hover:border-accent/25',
      ]"
      @click="emit('open', moment.id)"
      @keydown.enter.prevent="emit('open', moment.id)"
      @keydown.space.prevent="emit('open', moment.id)"
    >
      <!-- 左侧撕纸虚线 -->
      <div
        aria-hidden="true"
        class="border-warning/40 absolute top-3 bottom-3 left-2 border-l border-dashed"
      />

      <!-- 置顶别针徽章 -->
      <span
        v-if="moment.is_pinned"
        class="bg-warning/15 text-warning absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase shadow-sm"
      >
        <PinIcon class="h-3 w-3" />
        <span>置顶</span>
      </span>

      <!-- admin 浮动操作（hover 出现，避免抢戏） -->
      <div
        v-if="isAdmin"
        class="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
        @click.stop
      >
        <button
          type="button"
          class="text-muted hover:text-ink border-border/40 bg-page/95 inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors"
          :aria-label="`编辑 ${moment.id}`"
          @click="emit('edit', moment)"
        >
          <EditIcon class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="text-muted hover:text-destructive border-border/40 bg-page/95 inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors"
          :aria-label="`删除 ${moment.id}`"
          @click="emit('delete', moment)"
        >
          <IconDel class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- 元数据行 -->
      <MomentMeta
        :moment="moment"
        :volume-label="volumeLabel"
        class="relative pl-3"
      />

      <!-- 内容预览（衬线 + 首字下沉） -->
      <p
        class="text-ink/85 relative mt-2 line-clamp-3 pl-3 font-serif text-[15px] leading-loose"
        style="text-wrap: pretty"
      >
        <span class="moment-drop-cap text-ink/95">
          {{ moment.content.charAt(0) }}
        </span>
        <span>{{ moment.content.slice(1) }}</span>
      </p>

      <!-- 标签 chip 行 -->
      <div
        v-if="moment.tags.length"
        class="text-muted relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-3 text-[11px]"
        @click.stop
      >
        <MomentTagChip v-for="tag in moment.tags" :key="tag" :name="tag" />
      </div>
    </div>
  </motion.article>
</template>

<script setup lang="ts">
import { EditIcon } from '@/components';
import { IconDel } from '@/components';
import { PinIcon } from '@/components';
import type { Moment } from '@/features/moments/types';
import { motion } from 'motion-v';
import { WHILE_IN_VIEW_FADE_UP } from '@/constants';
import MomentMeta from './MomentMeta.vue';
import MomentTagChip from './MomentTagChip.vue';

defineProps<{
  moment: Moment;
  /** 卷序号，例如 "卷十二"；可选 */
  volumeLabel?: string;
  isAdmin?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open', id: string): void;
  (e: 'edit', moment: Moment): void;
  (e: 'delete', moment: Moment): void;
}>();
</script>

<style scoped>
/* 首字下沉：碎碎念卡的核心视觉差异点 */
.moment-drop-cap {
  font-family: serif;
  font-size: 2.4em;
  float: left;
  line-height: 0.9;
  margin: 0.05em 0.12em -0.05em 0;
  font-weight: 600;
}
</style>
