<template>
  <Modal :open="open" size="lg" @close="emit('update:open', false)">
    <!-- 顶栏：卷序 + 关闭 + admin 操作 -->
    <header
      class="border-border/40 bg-card sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-6 py-4"
    >
      <div class="flex items-center gap-3">
        <span class="text-foreground/70 font-serif text-sm italic">
          {{ volumeLabel }}
        </span>
        <span class="text-muted-foreground/60">·</span>
        <span class="text-muted-foreground font-mono text-[11px] tracking-wide">
          {{ formattedDateTime }}
        </span>
        <span
          v-if="moment?.is_pinned"
          class="text-warning inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
        >
          <span aria-hidden="true">·</span>
          <PinIcon class="h-3 w-3" />
          <span>置顶</span>
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- 上下条按钮 -->
        <div
          v-if="hasPrev || hasNext"
          class="text-muted-foreground flex items-center gap-1 text-[11px]"
        >
          <button
            type="button"
            :disabled="!hasPrev"
            class="hover:text-foreground border-border/40 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :aria-label="'上一条'"
            @click="emit('navigate', 'prev')"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :disabled="!hasNext"
            class="hover:text-foreground border-border/40 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            :aria-label="'下一条'"
            @click="emit('navigate', 'next')"
          >
            <ChevronRight class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- admin 操作 -->
        <template v-if="isAdmin">
          <button
            type="button"
            class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium shadow-sm transition-colors"
            @click="emit('edit', moment)"
          >
            <EditIcon class="h-3.5 w-3.5" />
            编辑
          </button>
          <button
            type="button"
            class="text-muted-foreground hover:text-destructive border-border/40 hover:border-destructive/40 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
            aria-label="删除"
            @click="emit('delete', moment)"
          >
            <IconDel class="h-3.5 w-3.5" />
          </button>
        </template>

        <button
          type="button"
          class="text-muted-foreground hover:text-foreground border-border/40 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
          aria-label="关闭"
          @click="emit('update:open', false)"
        >
          <IconClose class="h-3.5 w-3.5" />
        </button>
      </div>
    </header>

    <!-- 主体 -->
    <div
      v-if="moment"
      class="grid max-h-[calc(88vh-64px)] grid-cols-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_220px]"
    >
      <!-- 左：内容 -->
      <div class="overflow-y-auto px-8 py-8">
        <!-- 心情 -->
        <div
          v-if="moment.mood"
          class="text-muted-foreground mb-6 flex items-center gap-2 text-sm"
        >
          <span class="text-2xl" aria-hidden="true">{{ moodEmoji }}</span>
          <span v-if="moodText" class="italic">{{ moodText }}</span>
        </div>

        <!-- 内容（保留换行，后端已 escape） -->
        <div
          class="text-foreground/90 font-serif text-[16px] leading-loose"
          style="text-wrap: pretty; white-space: pre-wrap"
        >
          {{ moment.content }}
        </div>

        <!-- 标签 -->
        <div
          v-if="moment.tags.length"
          class="text-muted-foreground mt-8 flex flex-wrap items-center gap-2 text-[12px]"
        >
          <MomentTagChip v-for="tag in moment.tags" :key="tag" :name="tag" />
        </div>

        <!-- 元数据条 -->
        <div
          class="text-muted-foreground mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-border/40 pt-4 font-mono text-[11px] tracking-wide"
        >
          <span>发布于 {{ moment.published_at ?? moment.created_at }}</span>
          <span v-if="moment.source" class="text-muted-foreground/60">·</span>
          <span v-if="moment.source">来源 {{ moment.source }}</span>
          <span class="text-muted-foreground/60">·</span>
          <span>允许评论 {{ moment.allow_comment ? '是' : '否' }}</span>
        </div>
      </div>

      <!-- 右侧：元数据 sticky -->
      <aside
        class="bg-muted/30 border-border/40 hidden border-l px-5 py-6 md:block"
      >
        <div
          class="text-muted-foreground sticky top-4 font-mono text-[10px] tracking-[0.18em] uppercase"
        >
          META
        </div>
        <dl class="mt-4 space-y-3 text-sm">
          <MetaRow label="卷序" :value="volumeLabel" mono />
          <MetaRow label="心情" :value="moodDisplay" />
          <MetaRow label="标签" :value="moment.tags.join(' · ')" />
          <MetaRow
            v-if="moment.location?.name"
            label="地点"
            :value="moment.location.name"
          />
          <MetaRow label="可见性" :value="visibilityLabel" />
          <MetaRow label="状态" :value="statusLabel" />
        </dl>

        <div
          class="text-muted-foreground mt-6 border-t border-dashed border-border/40 pt-4 font-mono text-[10px] tracking-[0.18em] uppercase"
        >
          KEYBOARD
        </div>
        <ul class="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
          <li class="flex items-center gap-2">
            <Kbd label="J" /><span>下一条</span>
          </li>
          <li class="flex items-center gap-2">
            <Kbd label="K" /><span>上一条</span>
          </li>
          <li class="flex items-center gap-2">
            <Kbd label="Esc" /><span>关闭</span>
          </li>
        </ul>
      </aside>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import EditIcon from '@/components/icons/EditIcon.vue';
import IconClose from '@/components/icons/IconClose.vue';
import IconDel from '@/components/icons/IconDel.vue';
import PinIcon from '@/components/icons/PinIcon.vue';
import Modal from '@/components/ui/modal/Modal.vue';
import type { Moment, MomentStatus, MomentVisibility } from '@/types';
import dayjs from 'dayjs';
import { computed, defineComponent, h } from 'vue';
import MomentTagChip from './MomentTagChip.vue';

const props = defineProps<{
  open: boolean;
  moment: Moment | null;
  /** 当前 moment 在列表里的卷序号（从父级传入），用于显示 "卷三" 之类 */
  volumeLabel?: string;
  hasPrev?: boolean;
  hasNext?: boolean;
  isAdmin?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'edit', moment: Moment | null): void;
  (e: 'delete', moment: Moment | null): void;
  (e: 'navigate', direction: 'prev' | 'next'): void;
}>();

const formattedDateTime = computed(() => {
  if (!props.moment) return '';
  const raw = props.moment.published_at ?? props.moment.created_at;
  return dayjs(raw).format('YYYY-MM-DD HH:mm');
});

const isPureEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);
const moodEmoji = computed(() => {
  const m = props.moment?.mood ?? '';
  return isPureEmoji(m) ? m : '';
});
const moodText = computed(() => {
  const m = props.moment?.mood ?? '';
  return isPureEmoji(m) ? '' : m;
});
const moodDisplay = computed(() => {
  const m = props.moment?.mood;
  if (!m) return '—';
  return isPureEmoji(m) ? m : m;
});

const visibilityLabel = computed(() => {
  const map: Record<MomentVisibility, string> = {
    public: '公开',
    unlisted: '不列出',
    private: '不公开',
  };
  return props.moment ? map[props.moment.visibility] : '—';
});
const statusLabel = computed(() => {
  const map: Record<MomentStatus, string> = {
    published: '已发布',
    draft: '草稿',
    archived: '归档',
  };
  return props.moment ? map[props.moment.status] : '—';
});

// 内部小组件：元数据行
const MetaRow = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
    mono: { type: Boolean, default: false },
  },
  setup(p) {
    return () =>
      h('div', { class: 'flex flex-col gap-0.5' }, [
        h(
          'dt',
          {
            class:
              'text-muted-foreground font-mono text-[10px] tracking-[0.1em] uppercase',
          },
          p.label,
        ),
        h(
          'dd',
          {
            class: [
              'text-foreground',
              p.mono ? 'font-mono text-[12px]' : 'font-serif text-[13px]',
            ].join(' '),
          },
          p.value || '—',
        ),
      ]);
  },
});

// 内部小组件：键盘按键（直接函数式组件，避免 defineComponent 类型推断问题）
const Kbd = (props: { label: string }) =>
  h(
    'kbd',
    {
      class:
        'text-foreground/80 font-mono text-[10px] px-1.5 py-0.5 bg-card border border-border/40 rounded',
    },
    props.label,
  );
</script>
