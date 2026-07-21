<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

defineOptions({
  name: 'UiCardDescription',
});
</script>

<template>
  <p
    data-slot="card-description"
    :class="['text-muted-foreground text-sm', props.class]"
  >
    <slot />
  </p>
</template>
