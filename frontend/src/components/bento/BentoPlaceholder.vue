<template>
  <BentoCard class="relative overflow-hidden">
    <!-- Subtle dotted background pattern -->
    <div
      class="absolute inset-0 opacity-20"
      style="
        background-image: radial-gradient(#64748b 1px, transparent 1px);
        background-size: 16px 16px;
      "
    ></div>

    <div
      class="relative flex h-full min-h-30 w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/50 bg-white/20 transition-colors hover:bg-white/30"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "./BentoCard.vue";
</script>
