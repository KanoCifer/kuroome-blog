<template>
  <motion.div
    class="card border-border squircle bg-card/95 rounded-[64px] border p-6"
  >
    <slot></slot>
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v';
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
