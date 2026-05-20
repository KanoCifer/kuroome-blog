<template>
  <BentoCard>
    <img :src="imageSrc" class="w-3xs" />
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import { useCardImage } from "@/composables/useCardImage";

const { imageSrc } = useCardImage();
</script>

<style scoped></style>
