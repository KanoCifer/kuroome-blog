<template>
  <BentoCard :initial="{ scale: 0 }" :animate="{ scale: 1 }" class="min-w-0">
    <div
      class="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0"
    >
      <div
        class="bg-primary/15 flex h-12 w-12 items-center justify-center rounded-full"
      >
        <FishingRod class="text-primary size-6" />
      </div>
      <RouterLink
        to="/fishing-map"
        class="text-foreground max-w-full truncate font-serif text-sm sm:text-xl"
        >我的钓点</RouterLink
      >
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { FishingRod } from "lucide-vue-next";
</script>
