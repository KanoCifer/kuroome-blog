<script setup lang="ts">
import BentoSocial from "@/components/bento/BentoSocial.vue";
import { motion } from "motion-v";
const AboutIMG = "/images/about.webp";
</script>

<template>
  <div
    class="mx-auto my-auto flex max-w-6xl flex-col items-center justify-center"
  >
    <motion.div
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :while-hover="{ scale: 1.02 }"
      id="aboutView"
      class="mx-auto mt-36 flex max-w-6xl flex-col items-center justify-center"
    >
      <div
        class="squircle border-border bg-card/70 border p-8 shadow-sm transition-all duration-300 hover:shadow-md md:p-12"
      >
        <div
          class="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12"
        >
          <div class="group relative shrink-0">
            <div
              class="absolute -inset-1 rounded-full bg-linear-to-br from-pink-200 to-blue-200 opacity-50 blur transition duration-500 group-hover:opacity-75"
            ></div>
            <img
              :src="AboutIMG"
              alt="Kuroome"
              class="relative h-40 w-40 transform rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 md:h-48 md:w-48"
            />
          </div>
          <!-- 分割线 -->
          <div
            class="h-72 outline outline-stone-600/80 dark:outline-stone-100/80"
          ></div>

          <div class="flex-1 space-y-6 text-center md:text-left">
            <div
              class="text-muted-foreground space-y-4 text-lg leading-relaxed"
            >
              <p>
                <span class="text-2xl font-bold">我是 Kuroome。</span>
              </p>
              <p>
                技术栈
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >Python</span
                >
                、<span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >React</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >TaskIQ</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >FastApi</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >PostgreSQL</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >Vue3</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >Redis</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >MongoDB</span
                >
                等。
                <br />
              </p>
              <p>
                技术方向包含<span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >Web 开发</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >前后端</span
                >
                、
                <span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >Python数据分析</span
                >等。
              </p>
              <p>
                我的兴趣爱好广泛，涵盖<span
                  class="text-foreground decoration-primary/60 cursor-default font-medium underline decoration-4 underline-offset-2 transition-colors hover:decoration-pink-400"
                  >编程、阅读、钓鱼</span
                >等多个领域。
              </p>
              <p>
                这个网站主要用来记录我的学习、阅读、生活点滴，希望你能喜欢！如果你有任何建议或想法，欢迎通过下面的联系方式与我交流。
              </p>
            </div>

            <div
              class="flex items-center justify-center gap-6 pt-4 md:justify-start"
            >
              <span class="text-muted-foreground font-medium">联系方式：</span>

              <a
                href="https://github.com/KanoCifer"
                target="_blank"
                class="text-muted-foreground hover:text-foreground transform transition-colors hover:scale-110"
                title="GitHub"
              >
                <svg
                  class="h-6 w-6"
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
                class="text-muted-foreground hover:text-foreground transform transition-colors hover:scale-110"
                title="Email"
              >
                <svg
                  class="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    <BentoSocial
      :initial="{ scale: 0 }"
      :animate="{ scale: 1 }"
      class="mt-4 w-fit"
    />
  </div>
</template>
