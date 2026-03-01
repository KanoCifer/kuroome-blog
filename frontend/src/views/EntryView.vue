<template>
  <div
    class="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4 sm:p-8"
  >
    <div
      class="mx-auto grid w-full max-w-7xl grid-flow-dense auto-rows-[minmax(180px,auto)] grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4"
    >
      <!-- Left Column / Navigation -->
      <BentoNav class="col-span-1 md:row-span-3 lg:row-span-3" />

      <!-- Middle Top / Greeting -->
      <BentoGreeting class="col-span-1 md:col-span-2 lg:col-span-2" />

      <!-- Right Top / Clock -->
      <BentoClock class="col-span-1 md:col-span-1 lg:col-span-1" />

      <!-- Middle Middle / Recent -->
      <BentoRecent
        class="col-span-1 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2"
      />

      <!-- Right Middle / Calendar -->
      <BentoCalendar class="col-span-1 md:col-span-1 lg:col-span-1" />

      <!-- Right Middle Bottom / Social -->
      <BentoSocial class="col-span-1 md:col-span-1 lg:col-span-1" />

      <!-- Bottom Left / Recommend -->
      <BentoRecommend class="col-span-1 md:col-span-2 lg:col-span-3" />

      <!-- Bottom Right / Placeholder -->
      <BentoPlaceholder class="col-span-1 md:col-span-1 lg:col-span-1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import BentoNav from "@/components/bento/BentoNav.vue";
import BentoSocial from "@/components/bento/BentoSocial.vue";
import BentoRecent from "@/components/bento/BentoRecent.vue";
import BentoRecommend from "@/components/bento/BentoRecommend.vue";
import BentoClock from "@/components/bento/BentoClock.vue";
import BentoCalendar from "@/components/bento/BentoCalendar.vue";
import BentoGreeting from "@/components/bento/BentoGreeting.vue";
import BentoPlaceholder from "@/components/bento/BentoPlaceholder.vue";
</script>

<style scoped>
/* Any specific grid styles that cannot be handled by tailwind can go here */
</style>
