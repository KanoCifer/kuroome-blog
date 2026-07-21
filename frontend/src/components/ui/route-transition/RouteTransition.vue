<template>
  <RouterView v-slot="{ Component }">
    <template v-if="isEntryView">
      <component :is="Component" :key="route.path" />
    </template>
    <Transition v-else :name="transition.name" mode="out-in">
      <div :key="route.path">
        <component :is="Component" />
      </div>
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { useRouteTransition } from '@/composables/route-transition';

defineOptions({ name: 'RouteTransition' });

const { entryPath = '/' } = defineProps<{
  /** 首页路由路径 —— 该路径下不做路由过渡动画 */
  entryPath?: string;
}>();

const { transition, isEntryView, route } = useRouteTransition({ entryPath });
</script>