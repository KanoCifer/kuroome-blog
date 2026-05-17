<template>
  <motion.div
    :whileHover="{ scale: 1.02 }"
    :whilePress="{ scale: 0.98 }"
    class="card squircle rounded-[64px] border border-white p-6"
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
  background-color: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  box-shadow:
    rgba(0, 0, 0, 0.05) 0px 40px 50px -32px,
    rgba(255, 255, 255, 0.25) 0px 0px 20px 0px inset;
}
</style>
