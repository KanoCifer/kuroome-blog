<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-500 ease-out transform-gpu"
      enter-from-class="opacity-0 translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-300 ease-in transform-gpu"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-full"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-9999 flex justify-end"
        @click.self="close"
      >
        <!-- Drawer content -->
        <div
          class="bg-card relative z-10 flex h-full w-full max-w-md flex-col rounded-l-2xl"
        >
          <!-- Header -->
          <div
            class="border-border flex items-center justify-between border-b px-6 py-4"
          >
            <h3
              class="text-foreground flex items-center gap-2 font-serif text-lg font-bold"
            >
              <SettingIcon class="text-primary h-5 w-5" />
              偏好设置
            </h3>
            <button
              @click="close"
              class="text-muted-foreground hover:bg-accent hover:text-secondary-foreground dark:hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <IconClose class="h-5 w-5" />
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-border flex border-b px-6">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="relative px-4 py-3 text-sm font-medium transition-colors"
              :class="
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              "
            >
              {{ tab.label }}
              <span
                v-if="activeTab === tab.key"
                class="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
              />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <AppearanceTab v-show="activeTab === 'appearance'" />
            <BackgroundTab v-show="activeTab === 'background'" />
            <CardTab v-show="activeTab === 'card'" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import SettingIcon from '@/components/icons/SettingIcon.vue';
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

const tabs = [
  { key: 'appearance', label: '外观' },
  { key: 'background', label: '背景' },
  { key: 'card', label: '卡片' },
];
</script>
