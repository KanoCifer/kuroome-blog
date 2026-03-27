<template>
  <motion.div
    :whileHover="{ scale: 1.02 }"
    :whilePress="{ scale: 0.98 }"
    class="glass-card squircle rounded-[2rem] border border-white/40 bg-white/50 p-6 shadow-[0_20px_40px_rgba(21,28,39,0.06)] dark:border-white/10 dark:bg-slate-800/40 dark:shadow-none"
  >
    <slot></slot>
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from "motion-v";
</script>

<style scoped>
@reference "../../../assets/base.css";

.glass-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
</style>
