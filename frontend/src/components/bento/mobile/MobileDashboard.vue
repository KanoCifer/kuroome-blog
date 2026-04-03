<template>
  <div
    class="relative mx-auto flex min-h-dvh w-full max-w-md flex-row flex-wrap content-start gap-4 overflow-x-hidden p-5 pt-24 pb-32"
  >
    <MobileBentoProfileCard class="order-1 w-full min-w-0" />
    <MobileBentoGreeting class="order-2 w-full min-w-0" />
    <MobileBentoClock class="order-3 w-[calc(50%-0.5rem)] min-w-0" />
    <MobileBentoMemo class="order-4 w-[calc(50%-0.5rem)] min-w-0" />
    <BentoCalendar class="order-5 w-full min-w-0" />
    <MobileBentoTech class="order-6 w-full min-w-0" />
    <BentoMap class="order-7 w-[calc(50%-0.5rem)] min-w-0" />
    <BentoReadingList class="order-8 w-[calc(50%-0.5rem)] min-w-0" />
    <BentoNavCard class="order-9 w-full min-w-0" />
    <div
      class="absolute top-1/2 -right-20 w-70 min-w-3xs -translate-x-1/2 -translate-y-1/2 max-sm:static! max-sm:left-auto! max-sm:order-10 max-sm:w-full! max-sm:translate-0!"
    >
      <TodoCard title="MyTasks" />
    </div>
    <BentoWebsites class="order-11 w-full min-w-0" />
  </div>
</template>

<script setup lang="ts">
import { BentoCalendar, BentoMap, BentoNavCard, BentoReadingList, BentoWebsites, TodoCard } from "@/components/bento";
import MobileBentoClock from "./MobileBentoClock.vue";
import MobileBentoGreeting from "./MobileBentoGreeting.vue";
import MobileBentoMemo from "./MobileBentoMemo.vue";
import MobileBentoProfileCard from "./MobileBentoProfileCard.vue";
import MobileBentoTech from "./MobileBentoTech.vue";

defineEmits(["switchBackground"]);
</script>
