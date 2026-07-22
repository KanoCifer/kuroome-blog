<template>
  <RouterLink
    :to="{ name: 'moments', query: { tag: name } }"
    class="text-muted-foreground hover:text-ink hover:bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-serif text-[11px] tracking-wide transition-colors"
  >
    <span class="text-accent/70 font-serif">#</span>
    <span>{{ name }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>
