<template>
  <NavBento
    :layoutId="props.layoutId"
    :initial="props.initial"
    :animate="props.animate"
    :transition="props.transition"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { type MotionProps } from "motion-v";
import NavBento from "@/components/nav/BentoNavCard.vue";

const props = defineProps<{
  layoutId?: string;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
}>();
</script>
