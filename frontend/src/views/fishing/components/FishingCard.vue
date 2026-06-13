<script setup lang="ts">
/**
 * 统一的卡片 chrome wrapper。
 *
 * Dashboard 中所有 tile (Index / Weather / Tide / Hourly / Map / banner) 共享:
 * - bg-card / border-border 语义 token (无 dark: 手写)
 * - 圆角 + 阴影 + overflow hidden
 *
 * 区分:
 * - tone='default': 普通卡片
 * - tone='hero': 主视觉,带 ring 强调
 * - interactive: 鼠标悬停轻微提升
 * - padding: 6 (默认) / 4 (紧凑) / 0 (例如 map 这种内容铺满,padding 自行控制)
 */
interface Props {
  tone?: 'default' | 'hero';
  interactive?: boolean;
  padding?: 'default' | 'tight' | 'none';
  as?: 'article' | 'section' | 'div';
}

withDefaults(defineProps<Props>(), {
  tone: 'default',
  interactive: false,
  padding: 'default',
  as: 'article',
});
</script>

<template>
  <component
    :is="as"
    class="bg-card border-border relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm"
    :class="[
      tone === 'hero' && 'ring-primary/10 shadow-md ring-1',
      interactive &&
        'hover:border-border/80 cursor-pointer transition-shadow hover:shadow-md',
      padding === 'default' && 'p-6',
      padding === 'tight' && 'p-4',
    ]"
  >
    <slot />
  </component>
</template>
