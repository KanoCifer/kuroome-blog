<template>
  <NavBasic
    :isHeaderVisible="props.isHeaderVisible"
    :isEntryView="props.isEntryView"
    :isVisible="props.isVisible"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import NavBasic from "@/components/nav/BasicNav.vue";

const props = defineProps<{
  isHeaderVisible?: boolean;
  isEntryView?: boolean;
  isVisible?: boolean;
}>();
</script>
