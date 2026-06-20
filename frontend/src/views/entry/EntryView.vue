<template>
  <div
    class="relative min-h-dvh w-full"
    :style="containerStyle"
    ref="parentContainer"
  >
    <FloatingActionButtons
      @openSettings="openSettings"
      @goToFriendLinks="$router.push({ name: 'friend-links' })"
      @switchToMobile="switchToMobile"
    />
    <!-- Greeting 弹窗 -->
    <GreetingToast />
    <!-- 钓点卡片 -->
    <DragWrapper :position="greetingPosition" card-name="BentoMap">
      <BentoMap
        v-if="show.BentoMap"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoMap'),
        }"
        class="h-auto w-2xs min-w-fit"
      />
    </DragWrapper>
    <DragWrapper :position="profilePosition" card-name="BentoProfileCard">
      <BentoProfileCard
        v-if="show.BentoProfileCard"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoProfileCard'),
        }"
        ref="boxRef"
        class="h-70 w-90 min-w-fit"
      />
    </DragWrapper>
    <!-- <BentoWebsites
      v-if="show.BentoWebsites"
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      ref="webRef"
      class="absolute w-auto -translate-x-1/2 -translate-y-1/2 p-0!"
      :style="[websitesPosition]"
    /> -->
    <DragWrapper :position="clockCardPosition" card-name="BentoClock">
      <BentoClock
        v-if="show.BentoClock"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoClock'),
        }"
        ref="clockRef"
        class="w-auto"
      />
    </DragWrapper>
    <DragWrapper :position="calendarPosition" card-name="BentoCalendar">
      <BentoCalendar
        v-if="show.BentoCalendar"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoCalendar'),
        }"
        ref="calRef"
        class="w-auto"
      />
    </DragWrapper>
    <DragWrapper :position="techPosition" card-name="BentoTech">
      <BentoTech
        v-if="show.BentoTech"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoTech'),
        }"
        class="h-2xs w-68 p-4!"
      />
    </DragWrapper>

    <DragWrapper :position="listCardPosition" card-name="BentoReadingList">
      <BentoReadingList
        v-if="show.BentoReadingList"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoReadingList'),
        }"
        class="w-60 cursor-pointer"
      />
    </DragWrapper>

    <DragWrapper :position="todoCardPosition" card-name="TodoCard">
      <TodoCard
        v-if="show.TodoCard"
        :initial="{ scale: 0.5, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('TodoCard'),
        }"
        class="w-52"
      />
    </DragWrapper>
    <!-- <BentoCat v-if="show.BentoCat" :style="[catPosition]" class="absolute w-2xs -translate-x-1/2 -translate-y-1/2" /> -->

    <DragWrapper :position="picPosition" card-name="BentoPic">
      <!-- 新增照片卡片的拖拽容器 -->
      <BentoPic
        v-if="show.BentoPic"
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cardDelay('BentoPic'),
        }"
        class="cursor-pointer p-2!"
      />
      <!-- 中间的照片卡片 -->
    </DragWrapper>

    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsOpen" />
    <!-- Footer -->
    <BasicFooter
      class="absolute right-0 bottom-0 left-0"
      v-if="themeStore.showFooter === 'true'"
      :isEntryView="isEntryView"
      :isAboutView="isAboutView"
    />

    <!-- Edit Layout Toolbar -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="layoutStore.isEditing"
          class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white/90 px-5 py-3 shadow-lg backdrop-blur-md dark:bg-neutral-800/90"
        >
          <span class="text-sm font-medium text-neutral-500">编辑布局</span>
          <button
            @click="layoutStore.cancelEditing()"
            class="cursor-pointer rounded-xl border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            取消
          </button>
          <button
            @click="layoutStore.saveEditing()"
            class="cursor-pointer rounded-xl bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            保存
          </button>
          <button
            @click="layoutStore.resetAllOffsets()"
            class="cursor-pointer rounded-xl border border-red-300 px-4 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/30"
          >
            重置
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { BasicFooter } from '@/components/basic';
import {
  BentoCalendar,
  BentoClock,
  BentoProfileCard,
  BentoReadingList,
  BentoTech,
  TodoCard,
} from '@/components/bento';
import DragWrapper from '@/components/layout/DragWrapper.vue';
import FloatingActionButtons from '@/components/layout/FloatingActionButtons.vue';
import SettingsModal from '@/components/layout/SettingsModal.vue';
import { useCardLayout } from '@/composables/card';
import { useCardLayoutStore } from '@/stores/cardLayout';
import { useThemeStore } from '@/stores/theme';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import BentoMap from './components/BentoMap.vue';
import BentoPic from './components/BentoPic.vue';
import GreetingToast from './components/GreetingToast.vue';

const themeStore = useThemeStore();
const isEntryView = ref<boolean>(true);
const isAboutView = ref<boolean>(false);

const switchToMobile = () => {
  const expires = new Date();
  expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `device_force=react;expires=${expires.toUTCString()};path=/;domain=.kanocifer.chat`;
  window.location.href = 'https://m.kanocifer.chat';
};

const parentContainer = ref<HTMLElement | null>(null);

// Card layout — all position computation in one composable
const {
  containerStyle,
  greetingPosition,
  picPosition,
  profilePosition,
  clockCardPosition,
  calendarPosition,
  techPosition,
  listCardPosition,
  todoCardPosition,
  cardStyles,
} = useCardLayout(parentContainer);

const layoutStore = useCardLayoutStore();

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && layoutStore.isEditing) {
    layoutStore.cancelEditing();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const isSettingsOpen = ref(false);
const openSettings = () => {
  isSettingsOpen.value = true;
};

const show = reactive<Record<string, boolean>>({
  BentoProfileCard: true,
  BentoClock: true,
  BentoCalendar: true,
  BentoTech: true,
  BentoReadingList: true,
  TodoCard: true,
  BentoMap: true,
  BentoPic: true,
});

const ANIMATION_DELAY = 0.1;

// Compute stagger delay (in seconds) for each card based on its order
function cardDelay(cardName: string): number {
  const order = cardStyles[cardName]?.order || 0;
  return order * ANIMATION_DELAY;
}
</script>
