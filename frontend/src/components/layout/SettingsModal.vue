<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-700 ease-in-out transform-gpu"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-all duration-300"
      leave-from-class="opacity-100 blur-0 translate-x-0"
      leave-to-class="opacity-0 blur-sm translate-x-4"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-9999 flex justify-end"
        @click.self="close"
      >
        <!-- Drawer content -->
        <div
          class="bg-background relative z-10 flex h-full w-full max-w-[480px] flex-col"
        >
          <!-- 装帧书脊 -->
          <div class="bg-primary absolute top-0 bottom-0 left-0 w-[3px]" />

          <!-- 标题区 -->
          <header class="relative px-8 pt-10 pb-6 text-center">
            <button
              @click="close"
              class="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full transition-colors active:scale-[0.96]"
              aria-label="关闭"
            >
              <IconClose class="h-5 w-5" />
            </button>

            <div
              class="text-muted-foreground mb-3 font-mono text-[10px] tracking-[0.4em] uppercase"
            >
              Chapter
            </div>

            <h1
              class="text-foreground font-serif text-[28px] leading-tight font-semibold"
            >
              偏好设置
            </h1>

            <p class="text-muted-foreground mt-2 font-serif text-sm italic">
              Customize your reading experience
            </p>

            <div class="bg-primary mx-auto mt-6 h-px w-12" />
          </header>

          <!-- 章节书签 Tab -->
          <nav class="flex items-end justify-center gap-2 px-8">
            <button
              v-for="(tab, i) in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="group relative flex w-[88px] flex-col items-center rounded-lg py-1 transition-colors active:scale-[0.96]"
            >
              <span
                class="font-serif text-[11px] tracking-[0.2em]"
                :class="
                  activeTab === tab.key
                    ? 'text-primary'
                    : 'text-muted-foreground'
                "
              >
                {{ chapterNumerals[i] }}
              </span>
              <div
                class="mt-1.5 flex w-full items-center justify-center border-b-2 border-transparent py-2 transition-colors"
                :class="
                  activeTab === tab.key
                    ? 'border-primary bg-primary/5'
                    : 'group-hover:bg-muted'
                "
              >
                <span
                  class="text-sm"
                  :class="
                    activeTab === tab.key
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground font-medium'
                  "
                >
                  {{ tab.label }}
                </span>
              </div>
            </button>
          </nav>

          <!-- 内容区 -->
          <div class="flex-1 overflow-y-auto px-8 py-6">
            <AppearanceTab v-show="activeTab === 'appearance'" />
            <BackgroundTab v-show="activeTab === 'background'" />
            <CardTab v-show="activeTab === 'card'" />
          </div>

          <!-- 底部 -->
          <footer
            class="border-border flex items-center justify-between border-t px-8 py-3 font-mono text-[11px]"
          >
            <span class="text-muted-foreground font-sans">Settings · v3.8</span>
            <span class="text-muted-foreground font-serif italic"
              >ka·no·ci·fer</span
            >
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import IconClose from '@/components/icons/IconClose.vue';
import AppearanceTab from './AppearanceTab.vue';
import BackgroundTab from './BackgroundTab.vue';
import CardTab from './CardTab.vue';
import { ref } from 'vue';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const close = () => {
  emit('update:modelValue', false);
};

const activeTab = ref('appearance');

// 壹貳叁 — 财务大写数字，营造章节感
const chapterNumerals = ['壹', '貳', '叁'];

const tabs = [
  { key: 'appearance', label: '外观' },
  { key: 'background', label: '背景' },
  { key: 'card', label: '卡片' },
];
</script>
