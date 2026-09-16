<script setup lang="ts">
/**
 * Brand splash — ads.png 的窄横幅版。
 * 整张图只承载"是什么"和品牌色,不承担"做什么",叙事留给下方的 Hero。
 */
import { useI18n } from 'vue-i18n';
import { motion } from 'motion-v';

const { t } = useI18n();
</script>

<template>
  <section aria-label="Nomu brand splash" class="space-y-4">
    <motion.div
      :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.35, ease: 'easeOut' }"
      class="text-accent text-xs font-medium tracking-widest uppercase"
    >
      {{ t('noonTool.splash.eyebrow') }}
    </motion.div>
    <motion.div
      :initial="{ opacity: 0, scale: 0.985 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.4, ease: 'easeOut', delay: 0.05 }"
      class="overflow-hidden rounded-2xl shadow-md"
    >
      <img
        src="/noontool-screens/00-splash.png"
        alt="Nomu tool for Noon sellers"
        width="600"
        height="381"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        class="block h-auto w-full"
      />
    </motion.div>
  </section>
</template>

<script lang="ts">
export default { inheritAttrs: false };
</script>
