<script setup lang="ts">
import { computed } from 'vue';
import { buttonClasses, type ButtonVariants } from '.';

interface Props {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
});

defineOptions({
  name: 'UiButton',
});

const classes = computed(() => buttonClasses(props.variant, props.size, props.class));
</script>

<template>
  <button
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :type="type"
    :disabled="disabled"
    :class="classes"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
