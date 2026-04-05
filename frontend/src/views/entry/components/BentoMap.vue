<template>
  <BentoCard :initial="{ scale: 0 }" :animate="{ scale: 1 }" class="min-w-0">
    <div class="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
        <IconGlobal class="size-6 text-blue-500" />
      </div>
      <RouterLink
        to="/fishing-map"
        class="max-w-full truncate font-serif text-sm text-gray-800 sm:text-xl dark:text-white"
        >MyFishingMAP</RouterLink
      >
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import IconGlobal from "@/components/icons/IconGlobal.vue";
</script>
