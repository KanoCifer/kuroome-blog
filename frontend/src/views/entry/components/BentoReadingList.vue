<template>
  <BentoCard class="min-w-0">
    <div
      class="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0"
    >
      <div
        class="bg-warning/20 flex h-12 w-12 items-center justify-center rounded-full"
      >
        <ListCheck class="text-warning size-6" />
      </div>
      <RouterLink
        to="/home"
        class="text-foreground max-w-full truncate font-serif text-sm sm:text-xl"
        >我的书单</RouterLink
      >
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { ListCheck } from "lucide-vue-next";
</script>
