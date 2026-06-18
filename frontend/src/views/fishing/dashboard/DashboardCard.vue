<script setup lang="ts">
/**
 * 统一的卡片 chrome wrapper。
 *
 * Dashboard 中所有 tile (Index / Weather / Tide / Hourly / Map / banner) 共享:
 * - bg-card / border-border 语义 token (无 dark: 手写)
 * - 圆角 + 阴影 + overflow hidden
 *
 * 区分:
 * - tone='default': 普通卡片,hover 时 -2px 浮起 + 软阴影
 * - tone='hero': 主视觉,加渐变描边 + 斜向扫光 + 更明显的浮起
 * - interactive: 鼠标悬停浮起 + cursor-pointer (强调可点击)
 * - padding: 6 (默认) / 4 (紧凑) / 0 (例如 map 这种内容铺满,padding 自行控制)
 *
 * 动效统一走 motion-v (项目 §Dependencies 已有 motion-v ^2.3.0);
 * Hero 专属的渐变描边/扫光是装饰层,父级 hover 触发,继续用 CSS :hover 串联。
 */
import { motion } from 'motion-v';
import { computed } from 'vue';

interface Props {
  tone?: 'default' | 'hero';
  interactive?: boolean;
  padding?: 'default' | 'tight' | 'none';
  as?: 'article' | 'section' | 'div';
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'default',
  interactive: false,
  padding: 'default',
  as: 'article',
});

/**
 * motion-v 不支持动态 :is,把 as 映射到具体 motion 组件
 * (article / section / div 三种,够用)
 */
const motionMap = {
  article: motion.article,
  section: motion.section,
  div: motion.div,
} as const;

/**
 * 按 tone / interactive 计算 whileHover 的目标态
 * boxShadow 写在这里,而不是 CSS,这样 motion-v 可以 GPU 加速插值
 */
const whileHover = computed(() => {
  if (props.tone === 'hero') {
    return {
      y: -3,
      scale: 1.005,
      boxShadow:
        '0 12px 32px -8px oklch(from var(--primary) l c h / 0.22), 0 4px 12px -4px oklch(0% 0 0 / 0.08)',
    };
  }
  if (props.interactive) {
    return {
      y: -3,
      scale: 1.005,
      boxShadow:
        '0 10px 28px -8px oklch(from var(--primary) l c h / 0.18), 0 4px 10px -4px oklch(0% 0 0 / 0.08)',
    };
  }
  return {
    y: -2,
    boxShadow:
      '0 8px 22px -8px oklch(0% 0 0 / 0.14), 0 2px 6px -2px oklch(0% 0 0 / 0.06)',
  };
});
</script>

<template>
  <component
    :is="motionMap[as]"
    :while-hover="whileHover"
    :transition="{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }"
    class="group fishing-card bg-card border-border relative flex h-full flex-col overflow-hidden rounded-3xl border shadow-sm"
    :class="[
      tone === 'hero' && 'fishing-card--hero shadow-md',
      interactive && 'fishing-card--interactive cursor-pointer',
      padding === 'default' && 'p-6',
      padding === 'tight' && 'p-4',
    ]"
  >
    <!-- Hero 专属装饰:渐变描边 (mask 技巧) + 斜向扫光 -->
    <template v-if="tone === 'hero'">
      <span class="hero-glow" aria-hidden="true" />
      <span class="hero-sweep" aria-hidden="true" />
    </template>
    <slot />
  </component>
</template>

<style scoped>
/*
 * 卡片基础 transition —— 仅 border-color 由 CSS 控制 (motion-v 接管 transform/shadow)
 */
.fishing-card {
  transition: border-color 240ms ease;
  will-change: transform;
}

/*
 * Hero 卡片:渐变描边 (.hero-glow) + 斜向扫光 (.hero-sweep)
 * 父级 .fishing-card--hero:hover 触发,与 motion-v 浮起同步出现
 */
.fishing-card--hero {
  border-color: oklch(from var(--primary) l c h / 0.3);
}
.fishing-card--hero:hover {
  border-color: oklch(from var(--primary) l c h / 0.6);
}

.hero-glow {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 40%,
    oklch(from var(--primary) l c h / 0.55) 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 360ms ease;
  pointer-events: none;
  z-index: 0;
}
.fishing-card--hero:hover .hero-glow {
  opacity: 1;
}

.hero-sweep {
  position: absolute;
  top: 0;
  left: -40%;
  width: 32%;
  height: 100%;
  background: linear-gradient(
    100deg,
    transparent,
    oklch(from var(--primary-foreground) l c h / 0.18),
    transparent
  );
  opacity: 0;
  transition:
    left 720ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms ease;
  pointer-events: none;
  z-index: 0;
}
.fishing-card--hero:hover .hero-sweep {
  left: 110%;
  opacity: 1;
}

/* reduced motion: 关闭扫光;motion-v 自带 whileHover 也会因 prefers-reduced-motion 自动降级 */
@media (prefers-reduced-motion: reduce) {
  .hero-sweep {
    display: none;
  }
}
</style>
