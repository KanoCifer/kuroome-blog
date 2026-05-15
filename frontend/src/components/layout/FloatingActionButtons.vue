<template>
  <!-- Settings button -->
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
    <button
      @click="$emit('openSettings')"
      class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-500 ease-out"
      title="偏好设置"
    >
      <SettingIcon class="text-primary h-5 w-5 shrink-0 transition-colors duration-500 group-hover:text-white" />
      <span
        class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-500 ease-out group-hover:max-w-20 group-hover:opacity-100"
      >
        偏好设置
      </span>
    </button>
  </div>

  <!-- Friend links button -->
  <div class="fixed top-16 right-4 z-50 flex flex-col gap-2">
    <button
      @click="$emit('goToFriendLinks')"
      class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-500 ease-out"
      title="友情链接"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-primary h-5 w-5 shrink-0 transition-colors duration-500 group-hover:text-white"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span
        class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-500 ease-out group-hover:max-w-20 group-hover:opacity-100"
      >
        友链
      </span>
    </button>
  </div>

  <!-- Switch to mobile button -->
  <div class="fixed top-28 right-4 z-50 flex flex-col gap-2">
    <button
      @click="$emit('switchToMobile')"
      class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-500 ease-out"
      title="切换到移动版"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-primary h-5 w-5 shrink-0 transition-colors duration-500 group-hover:text-white"
      >
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
      <span
        class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-500 ease-out group-hover:max-w-28 group-hover:opacity-100"
      >
        移动版
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import SettingIcon from "@/views/entry/icon/SettingIcon.vue";

defineEmits<{
  (e: "openSettings"): void;
  (e: "goToFriendLinks"): void;
  (e: "switchToMobile"): void;
}>();
</script>
