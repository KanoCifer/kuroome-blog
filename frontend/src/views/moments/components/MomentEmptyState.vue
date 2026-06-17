<template>
  <div
    class="border-border/40 bg-card/60 mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center"
  >
    <div
      class="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full"
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H6.75m6.75 0v3.75m-3.75-3.75v3.75m-3.75 0h10.5a2.25 2.25 0 002.25-2.25V9.621c0-.596-.237-1.169-.659-1.591l-5.871-5.872A2.25 2.25 0 0010.379 1.5H5.25A2.25 2.25 0 003 3.75v14.25A2.25 2.25 0 005.25 20.25z"
        />
      </svg>
    </div>
    <div>
      <h3 class="text-foreground font-serif text-lg">
        {{ title }}
      </h3>
      <p class="text-muted-foreground mt-1 text-sm">
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '还没有碎碎念',
    description: '等到想写一句的时候，再来吧。',
  },
);
</script>
