<template>
  <motion.div
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :whileHover="{ scale: 1.05 }"
    :whileTap="{ scale: 0.9 }"
  >
    <img
      class="cat squircle mx-auto aspect-auto size-48 transform transform-gpu rounded-4xl shadow-2xl transition-transform hover:scale-105 hover:rotate-2"
      src="/images/cat.webp"
      alt="Cat Image"
    />
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v';
</script>
