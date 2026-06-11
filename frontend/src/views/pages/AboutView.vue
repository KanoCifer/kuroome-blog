<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue';
import { motion } from 'motion-v';
import { useTypewriter } from '@/composables/useTypewriter';

const AboutIMG = '/images/about.webp';

// Greeting typewriter
const greeting = useTypewriter();
const GREETING_TEXT = '你好；)';
const GREETING_SPEED = 1; // 1 char/frame ≈ 60 chars/sec

// Bio typewriter — each line types sequentially
const bioLines = [
  { hook: useTypewriter(), text: '我是 Kuroome。', class: 'font-bold' },
  {
    hook: useTypewriter(),
    text: '技术栈包括 Python、React、TaskIQ、FastAPI、PostgreSQL、Vue3、Redis、MongoDB 等。',
  },
  {
    hook: useTypewriter(),
    text: '技术方向包含 Web 开发、前后端、Python 数据分析等。',
  },
  {
    hook: useTypewriter(),
    text: '我的兴趣爱好广泛，涵盖编程、阅读、钓鱼等多个领域。',
  },
  {
    hook: useTypewriter(),
    text: '这个网站主要用来记录我的学习、阅读、生活点滴，希望你能喜欢！',
  },
];

const activeLineIdx = ref(-1);
const BIO_SPEED = 1; // 1 char/frame ≈ 60 chars/sec

const allBioDone = computed(
  () => bioLines.length > 0 && bioLines.every((l) => l.hook.isDone.value),
);

function typeNextLine(idx: number) {
  if (idx >= bioLines.length) return;
  activeLineIdx.value = idx;
  bioLines[idx].hook.start(bioLines[idx].text, BIO_SPEED, () =>
    setTimeout(() => typeNextLine(idx + 1), 300),
  );
}

onMounted(() => {
  nextTick();
  greeting.start(GREETING_TEXT, GREETING_SPEED, () =>
    setTimeout(() => typeNextLine(0), 500),
  );
});
</script>

<template>
  <div
    class="about-page bg-card flex min-h-screen flex-col items-center justify-center px-6 py-20"
  >
    <!-- Hero: greeting + avatar -->
    <div
      class="hero-section animate-message-pop flex flex-col items-center gap-6"
    >
      <motion.div
        :initial="{ scale: 0, opacity: 0 }"
        :animate="{ scale: 1, opacity: 1 }"
        :transition="{ type: 'spring' }"
        class="avatar-wrapper relative"
      >
        <div class="avatar-glow"></div>
        <img
          :src="AboutIMG"
          alt="Kuroome"
          class="avatar-img relative h-28 w-28 rounded-full border-[3px] border-white object-cover shadow-xl md:h-36 md:w-36"
        />
      </motion.div>

      <div class="greeting-wrapper">
        <span class="greeting-text">{{ greeting.text.value }}</span>
        <span v-if="!greeting.isDone.value" class="cursor-blink"></span>
      </div>
    </div>

    <!-- Divider -->
    <div class="divider my-10 w-xs"></div>

    <!-- Bio lines -->
    <div class="bio-section flex flex-col items-center gap-1 text-center">
      <div v-for="(line, i) in bioLines" :key="i" class="bio-line-wrapper">
        <span :class="line.class" class="bio-text">{{
          line.hook.text.value
        }}</span>
        <span
          v-if="activeLineIdx === i && !line.hook.isDone.value"
          class="cursor-blink"
        ></span>
      </div>
    </div>

    <!-- Social links -->
    <motion.div
      :initial="{ opacity: 0, y: 12 }"
      :animate="allBioDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }"
      :transition="{ duration: 0.6 }"
      class="social-section mt-10 flex items-center gap-5"
    >
      <span class="text-muted-foreground text-sm font-medium tracking-wide"
        >联系方式</span
      >
      <div class="bg-border h-4 w-px"></div>
      <a
        href="https://github.com/KanoCifer"
        target="_blank"
        class="social-link text-muted-foreground hover:text-foreground"
        title="GitHub"
      >
        <svg
          class="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
      <a
        href="mailto:kano3255@outlook.com"
        class="social-link text-muted-foreground hover:text-foreground"
        title="Email"
      >
        <svg
          class="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
          />
        </svg>
      </a>
    </motion.div>
  </div>
</template>

<style scoped>
.greeting-text {
  font-size: clamp(3rem, 10vw, 6rem);
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--color-foreground);
}

.bio-text {
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--color-muted-foreground);
}

.bio-line-wrapper {
  display: inline;
}

.greeting-wrapper {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-height: 1.2em;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  background-color: var(--color-primary);
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.divider {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-border) 30%,
    var(--color-border) 70%,
    transparent
  );
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-accent)
  );
  opacity: 0.25;
  filter: blur(14px);
  transition: opacity 0.5s ease;
}

.avatar-wrapper:hover .avatar-glow {
  opacity: 0.45;
}

.social-link {
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.social-link:hover {
  transform: scale(1.15);
}
</style>
