<template>
  <!-- Footer -->
  <footer
    class="text-foreground transition-colors duration-1000"
    :class="!props.isAboutView && !props.isEntryView ? 'bg-background' : 'bg-transparent'"
  >
    <p class="text-foreground">
      Copyright &copy; 2026
      <span class="text-muted-foreground ml-3 inline-flex items-center gap-1.5 text-xs">
        <span class="relative flex h-2 w-2">
          <span class="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span class="bg-success relative inline-flex h-2 w-2 rounded-full"></span>
        </span>
        {{ visitorCount.count }} 人在线
      </span>
    </p>
    <div class="flex items-end justify-center gap-4">
      <a
        href="https://github.com/KanoCifer/Flask-Example"
        aria-label="Kuroome on GitHub"
        class="hover:opacity-90"
        target="_blank"
      >
        <img
          alt="Powered by Flask"
          src="https://github.githubassets.com/favicons/favicon.svg"
          class="cover aspect-square w-6 object-cover align-bottom"
        />
      </a>
      <a class="text-foreground hover:underline" target="_blank">Github: KanoCifer</a>
      <a class="text-foreground hover:underline" target="_blank">粤ICP备2026018113号</a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useVisitorCountStore } from "@/stores/visitorCount";

const visitorCount = useVisitorCountStore();

const props = defineProps<{
  isEntryView: boolean;
  isAboutView: boolean;
}>();
</script>
