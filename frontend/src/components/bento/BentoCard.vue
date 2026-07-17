<template>
  <motion.div
    :initial="{ scale: 0, opacity: 0, filter: 'blur(2px)' }"
    :animate="{ scale: 1, opacity: 1, filter: 'blur(0)' }"
    :transition="{
      scale: {
        type: 'spring',
        stiffness: 320,
        damping: 28,
      },
      opacity: {
        duration: 0.4,
        ease: 'easeOut',
      },
      filter: {
        duration: 0.5,
        ease: 'easeOut',
      },
    }"
    class="card group border-border squircle bg-background/95 relative overflow-hidden border p-6"
  >
    <slot></slot>
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v';
</script>

<style scoped>
@reference "@/assets/base.css";

/*.card {
  box-shadow:
    color-mix(in srgb, var(--color-foreground) 12%, transparent) 0px 40px
      50px -32px,
    color-mix(in srgb, var(--color-foreground) 8%, transparent) 0px 60px
      80px -48px,
    rgba(255, 255, 255, 0.35) 0px 0px 20px 0px inset;
}*/

.card {
  will-change: transform, filter;
  border: 1px solid rgb(255 255 255 / 0.6);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.7),
    inset 0 -1px 2px rgb(0 0 0 / 0.03),
    0 3px 8px rgb(0 0 0 / 0.06),
    0 1px 3px rgb(0 0 0 / 0.04);
}

.dark .card {
  border-color: rgb(255 255 255 / 0.12);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.12),
    inset 0 -1px 2px rgb(0 0 0 / 0.1),
    0 3px 8px rgb(0 0 0 / 0.2),
    0 1px 3px rgb(0 0 0 / 0.15);
}
</style>
