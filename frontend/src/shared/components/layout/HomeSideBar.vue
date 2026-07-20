<template>
  <div class="col-span-1">
    <!-- 右侧边栏 -->
    <div class="sticky top-30 h-fit space-y-6">
      <!-- 个人简介卡片 -->
      <BentoProfileCard />
      <!-- 日历组件 -->
      <BentoCalendar />
      <!-- Tech Stack Card -->
      <BentoTech class="h-2xs mx-auto w-70 p-0!" />
    </div>
  </div>
</template>

<script setup lang="ts">
import BentoCalendar from '@/features/entry/components/BentoCalendar.vue';
import BentoProfileCard from '@/features/entry/components/BentoProfileCard.vue';
import BentoTech from '@/features/entry/components/BentoTech.vue';
</script>
