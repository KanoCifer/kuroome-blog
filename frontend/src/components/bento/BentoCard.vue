<template>
  <motion.div
    :whileHover="{ scale: 1.05 }"
    :whilePress="{ scale: 0.95 }"
    class="card squircle border-border/50 bg-card/55 ring-border/30 rounded-[40px] border p-6 shadow-sm ring"
  >
    <slot></slot>
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from "motion-v";
</script>

<style scoped>
@reference "../../assets/base.css";

.card {
  box-shadow: 0 40px 50px -32px rgba(0, 0, 0, 0.1);
}
</style>
