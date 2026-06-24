<template>
  <motion.div
    class="card group border-border squircle bg-background/85 relative overflow-hidden border p-6"
  >
    <div
      v-if="hoverEffect"
      class="via-primary-foreground/25 absolute inset-0 -translate-x-full bg-linear-to-r from-transparent to-transparent transition-transform duration-500 group-hover:translate-x-full"
    />
    <slot></slot>
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v';

interface Props {
  hoverEffect?: boolean;
}

const { hoverEffect = true } = defineProps<Props>();
</script>

<style scoped>
@reference "@/assets/base.css";

.card {
  box-shadow:
    color-mix(in srgb, var(--color-foreground) 12%, transparent) 0px 40px
      50px -32px,
    color-mix(in srgb, var(--color-foreground) 8%, transparent) 0px 60px
      80px -48px,
    rgba(255, 255, 255, 0.35) 0px 0px 20px 0px inset;
}
</style>
