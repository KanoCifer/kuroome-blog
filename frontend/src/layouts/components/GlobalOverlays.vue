<template>
  <!-- Cookie consent (顶层 Teleport 到 body) -->
  <Teleport to="body">
    <CookieConsent />
  </Teleport>

  <!-- Toast container -->
  <Teleport to="body">
    <ToastContainer />
  </Teleport>

  <!-- Feature overlays -->
  <DynamicIsland />
  <TaskDrawer />
</template>

<script setup lang="ts">
import CookieConsent from '@/shared/components/layout/CookieConsent.vue';
import ToastContainer from '@/shared/components/layout/ToastContainer.vue';
import DynamicIsland from '@/layouts/components/DynamicIsland.vue';
import TaskDrawer from '@/layouts/components/TaskDrawer.vue';
</script>