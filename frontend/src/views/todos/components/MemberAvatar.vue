<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none"
    :class="[sizeClass, bgClass, textClass]"
    :title="`用户 ${userId}`"
    :aria-label="`用户 ${userId}`"
  >
    {{ initials }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    userId: number;
    /** 头像尺寸。xs 用在筛选 chip / 泳道标签；sm 用在卡片头像。 */
    size?: 'xs' | 'sm' | 'md';
  }>(),
  { size: 'sm' },
);

// ── 尺寸 ──
// xs：12px 文字，h-5；sm：14px 文字，h-7；md：16px 文字，h-9
const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'h-5 w-5 text-[10px]';
    case 'md':
      return 'h-9 w-9 text-sm';
    default:
      return 'h-7 w-7 text-xs';
  }
});

// ── 确定性背景色 —— 从 userId 哈希映射到 Tailwind 语义化色对 ──
//
// 复用项目既有 TypeBadge 色板但限制在 Tailwind 安全类（编译期可见）。
// 同时给出 dark: 变体，跟随项目全局主题。
interface AvatarPalette {
  bg: string;
  text: string;
}
const PALETTES: AvatarPalette[] = [
  {
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
  },
  {
    bg: 'bg-teal-100 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
  },
];

const palette = computed<AvatarPalette>(() => {
  // 32-bit FNV-1a 哈希；负数取反，与正数共用同一组色。
  let h = 0x811c9dc5;
  const s = String(props.userId);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const idx = Math.abs(h) % PALETTES.length;
  return PALETTES[idx]!;
});

const bgClass = computed(() => palette.value.bg);
const textClass = computed(() => palette.value.text);

// ── 首字母 —— 没有姓名数据，用 "U" + userId 末两位作为头像缩写 ──
const initials = computed(() => {
  const id = props.userId;
  if (id < 10) return `U${id}`;
  // 末两位，例如 42 → "42"
  return `U${id % 100}`.padStart(2, '0').slice(-2);
});
</script>
