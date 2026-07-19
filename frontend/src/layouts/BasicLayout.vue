<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  BackdropLayer,
  FooterToggle,
  GlobalOverlays,
  Header,
} from './components';
import { RouteTransition } from '@/components/ui/route-transition';

const route = useRoute();
const isEntryView = computed(() => route.path === '/');
</script>

<template>
  <div
    class="relative isolate"
    :class="
      isEntryView
        ? 'flex min-h-dvh flex-col'
        : 'grid min-h-dvh grid-rows-[auto_1fr_auto]'
    "
  >
    <BackdropLayer :is-entry-view="isEntryView" />
    <Header />
    <main class="relative flex-1 scroll-smooth">
      <RouteTransition />
    </main>
    <FooterToggle :is-entry-view="isEntryView" />
    <GlobalOverlays />
  </div>
</template>