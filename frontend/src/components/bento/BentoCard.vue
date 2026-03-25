<template>
  <motion.div
    :whileHover="{ scale: 1.05 }"
    :whilePress="{ scale: 0.95 }"
    class="card squircle rounded-[40px] border border-white/60 bg-gray-50/50 p-6 shadow-sm ring ring-gray-50/70 dark:border-gray-700 dark:bg-gray-800/80 dark:ring-gray-600"
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
