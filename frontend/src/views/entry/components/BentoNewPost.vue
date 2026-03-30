<template>
  <motion.div
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :while-hover="{ scale: 1.1 }"
    :while-press="{ scale: 0.9 }"
    class="w-auto"
  >
    <button
      class="squircle flex cursor-pointer items-center bg-blue-600/80 px-4 py-2 text-2xl font-semibold text-gray-50 ring ring-gray-50/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:ring-gray-600"
      @click="handleClick"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="mr-2 h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          clip-rule="evenodd"
        />
      </svg>
      New
    </button>
  </motion.div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { motion } from "motion-v";
import { useRouter } from "vue-router";
const auth = useAuthStore();
const user = auth.user;
const router = useRouter();

const handleClick = () => {
  if (!user) {
    console.warn("User must be logged in to create a new post.");
    return;
  }
  router.push("/blog/new");
};
</script>
