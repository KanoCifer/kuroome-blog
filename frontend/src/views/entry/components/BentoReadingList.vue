<template>
  <BentoCard class="min-w-0">
    <div class="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
        <ListCheck class="size-6 text-orange-500" />
      </div>
      <RouterLink to="/home" class="max-w-full truncate font-serif text-sm text-gray-800 sm:text-xl dark:text-white"
        >我的书单</RouterLink
      >
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { ListCheck } from "lucide-vue-next";
</script>
