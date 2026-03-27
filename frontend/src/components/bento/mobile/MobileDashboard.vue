<template>
  <div
    class="relative min-h-dvh w-full max-sm:mx-auto max-sm:flex max-sm:max-w-md max-sm:flex-row max-sm:flex-wrap max-sm:content-start max-sm:gap-4 max-sm:overflow-x-hidden max-sm:p-5 max-sm:pt-24 max-sm:pb-32"
  >
    <!-- Mobile Top App Bar -->
    <header
      class="fixed top-0 left-0 z-50 flex w-full items-center justify-between rounded-b-[2rem] bg-white/60 px-6 py-4 shadow-[0_20px_40px_rgba(21,28,39,0.06)] backdrop-blur-xl dark:bg-slate-900/60 dark:shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
    >
      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 overflow-hidden rounded-full border-2 border-blue-600/20"
        >
          <img
            src="/images/about.webp"
            alt="Avatar"
            class="h-full w-full object-cover"
          />
        </div>
        <h1
          class="font-['Plus_Jakarta_Sans'] text-lg font-bold tracking-tight text-blue-700 dark:text-blue-400"
        >
          Kuroome Dashboard
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <ThemeToggle class="scale-90" />
        <button
          @click="$emit('switchBackground')"
          class="rounded-full p-2 transition-transform hover:bg-white/20 active:scale-95 dark:hover:bg-slate-800/50"
          title="切换背景图"
        >
          <svg
            class="h-5 w-5 text-slate-500 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
    </header>

    <MobileBentoProfileCard class="order-1 w-full" />
    <MobileBentoGreeting class="order-2 w-full" />
    <MobileBentoClock class="order-3 w-[calc(50%-0.5rem)]" />
    <MobileBentoMemo class="order-4 w-[calc(50%-0.5rem)]" />
    <BentoCalendar class="order-5 w-full" />
    <MobileBentoTech class="order-6 w-full" />
    <BentoReadingList class="order-7 w-full" />
    <BentoNavCard class="order-8 w-full" />
    <BentoNewPost class="order-9 w-full" />
    <BentoWebsites class="order-10 w-full" />
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from "@/components/layout/ThemeToggle.vue";
import MobileBentoProfileCard from "./MobileBentoProfileCard.vue";
import MobileBentoGreeting from "./MobileBentoGreeting.vue";
import MobileBentoClock from "./MobileBentoClock.vue";
import MobileBentoMemo from "./MobileBentoMemo.vue";
import MobileBentoTech from "./MobileBentoTech.vue";
import {
  BentoCalendar,
  BentoReadingList,
  BentoNavCard,
  BentoNewPost,
  BentoWebsites,
} from "@/components/bento";

defineEmits(["switchBackground"]);
</script>
