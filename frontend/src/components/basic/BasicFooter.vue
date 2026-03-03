<template>
  <!-- Footer -->
  <footer
    :class="
      props.showFooterBg ? 'bg-gray-50 dark:bg-gray-900' : 'bg-transparent'
    "
  >
    <p>Copyright &copy; 2026 All Rights Reserved.</p>
    <div class="flex items-end justify-center">
      <a
        href="https://github.com/KanoCifer/Flask-Example"
        aria-label="Kuroome on GitHub"
        class="hover:opacity-90"
        target="_blank"
      >
        <img
          alt="Powered by Flask"
          :src="githubLogo"
          class="cover aspect-square w-6 object-cover align-bottom"
        />
      </a>
      <a
        class="hover:underline"
        href="https://github.com/KanoCifer/Flask-Example "
        target="_blank"
        >&nbsp;Github: KanoCifer</a
      >
      <a
        class="hover:underline"
        href="https://beian.miit.gov.cn/#/Integrated/index"
        target="_blank"
        >&nbsp;粤ICP备2026018113号</a
      >
    </div>
  </footer>
</template>

<script setup lang="ts">
import githubLogo from "/images/github.webp";
const props = defineProps<{
  showFooterBg: boolean;
}>();
</script>
