<template>
  <div class="relative min-h-dvh w-full" :style="containerStyle" ref="parentContainer">
    <FloatingActionButtons
      @openSettings="openSettings"
      @goToFriendLinks="goToFriendLinks"
      @switchToMobile="switchToMobile"
    />
    <!-- Greeting 弹窗 -->
    <GreetingToast />
    <!-- 钓点卡片 -->
    <BentoMap
      v-if="show.BentoMap"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :style="[greetingPosition]"
      class="absolute h-auto w-2xs min-w-fit -translate-x-1/2 -translate-y-1/2"
    />
    <BentoProfileCard
      v-if="show.BentoProfileCard"
      :initial="{ scale: 0.5, opacity: 0 }"
      :animate="{ scale: 1, opacity: 1 }"
      ref="boxRef"
      :style="[profilePosition]"
      class="absolute h-70 w-90 min-w-fit -translate-x-1/2 -translate-y-1/2"
    />
    <AnimatePresence>
      <BentoNavCard
        v-if="show.BentoNavCard"
        layoutId="nav-card"
        :exit="{ opacity: 0, width: 0, transition: { duration: 0.5 } }"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 500,
          damping: 35,
          mass: 1,
        }"
        class="absolute w-68 -translate-x-1/2 -translate-y-1/2"
        :style="[navCardPosition]"
      />
    </AnimatePresence>
    <!-- <BentoWebsites
      v-if="show.BentoWebsites"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="webRef"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2 p-0!"
      :style="[websitesPosition]"
    /> -->
    <BentoClock
      v-if="show.BentoClock"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="clockRef"
      :style="[clockCardPosition]"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2"
    />
    <BentoCalendar
      v-if="show.BentoCalendar"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="calRef"
      :style="[calendarPosition]"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2"
    />
    <BentoTech
      v-if="show.BentoTech"
      :initial="{ scale: 0.5 }"
      :animate="{ scale: 1 }"
      class="h-2xs absolute w-68 -translate-x-1/2 -translate-y-1/2 p-0!"
      :style="[techPosition]"
    />

    <BentoReadingList
      v-if="show.BentoReadingList"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      :style="[listCardPosition]"
      class="absolute w-90 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
    />
    <!-- <BentoCat v-if="show.BentoCat" :style="[catPosition]" class="absolute w-2xs -translate-x-1/2 -translate-y-1/2" /> -->
    <div
      v-if="show.TodoCard"
      :style="[todoPosition]"
      class="absolute top-1/2 -right-20 w-70 min-w-3xs -translate-x-1/2 -translate-y-1/2"
    >
      <TodoCard title="MyTasks" />
    </div>
    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsOpen" />
  </div>
</template>

<script setup lang="ts">
import {
  BentoCalendar,
  BentoClock,
  BentoMap,
  BentoNavCard,
  BentoProfileCard,
  BentoReadingList,
  BentoTech,
  TodoCard,
} from "@/components/bento";
import FloatingActionButtons from "@/components/layout/FloatingActionButtons.vue";
import SettingsModal from "@/components/layout/SettingsModal.vue";
import { useCardLayout } from "@/composables/useCardLayout";
import { AnimatePresence } from "motion-v";
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import GreetingToast from "./components/GreetingToast.vue";

const router = useRouter();

const goToFriendLinks = () => {
  router.push({ name: "friend-links" });
};

const switchToMobile = () => {
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `device_force=react;expires=${expires.toUTCString()};path=/;domain=.kanocifer.chat`;
  window.location.href = "https://m.kanocifer.chat";
};

const parentContainer = ref<HTMLElement | null>(null);

// Card layout — all position computation in one composable
const {
  containerStyle,
  greetingPosition,
  todoPosition,
  profilePosition,
  navCardPosition,
  clockCardPosition,
  calendarPosition,
  techPosition,
  listCardPosition,
  cardStyles,
  cardNamesByOrder,
  maxOrder,
} = useCardLayout(parentContainer);

const isSettingsOpen = ref(false);
const openSettings = () => {
  isSettingsOpen.value = true;
};

const show = ref<Record<string, boolean>>({
  BentoGreeting: false,
  BentoProfileCard: false,
  BentoNavCard: false,
  BentoClock: false,
  BentoCalendar: false,
  BentoMemo: false,
  BentoNewPost: false,
  BentoTech: false,
  BentoWebsites: false,
  BentoReadingList: false,
  BentoCat: false,
  BentoLike: false,
  TodoCard: false,
  BentoMap: false,
});

const ANIMATION_DELAY = 0.1;

// Staggered animation entry by order from card-styles.json
onMounted(async () => {
  await nextTick();

  cardNamesByOrder.forEach((cardName) => {
    const order = cardStyles[cardName]?.order || 0;
    const delay = order * ANIMATION_DELAY * 1000;
    setTimeout(() => {
      show.value[cardName] = true;
    }, delay);
  });

  // Refresh dimensions after all cards have rendered
  const maxDelay = maxOrder * ANIMATION_DELAY * 1000;
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, maxDelay);
});
</script>
