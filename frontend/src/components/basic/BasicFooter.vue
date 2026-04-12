<template>
  <!-- Footer -->
  <footer
    class="text-gray-700 transition-colors duration-1000"
    :class="!props.isAboutView && !props.isEntryView ? 'bg-blue-50 dark:bg-gray-900' : 'bg-transparent'"
  >
    <p class="text-gray-700">Copyright &copy; 2026 All Rights Reserved.</p>
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
      <a class="text-gray-700 hover:underline" href="https://github.com/KanoCifer/Flask-Example " target="_blank"
        >Github: KanoCifer</a
      >
      <a class="text-gray-700 hover:underline" href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank"
        >粤ICP备2026018113号</a
      >
      <button
        @click="switchToReact"
        class="rounded-lg border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
      >
        切换到移动版
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
const props = defineProps<{
  isEntryView: boolean;
  isAboutView: boolean;
}>();

function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;domain=.kanocifer.chat`;
}

function switchToReact() {
  setCookie('device_force', 'react', 30);
  window.location.href = 'https://m.kanocifer.chat';
}
</script>
