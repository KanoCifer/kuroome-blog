<template>
  <div id="HomeSideBar" class="hidden lg:col-span-1 lg:block">
    <!-- 右侧边栏 -->
    <div class="sticky top-30 space-y-6">
      <!-- Profile Card -->
      <div
        class="rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80"
      >
        <div class="flex flex-col items-center text-center">
          <!-- Avatar with Glow -->
          <div class="group relative mb-4">
            <!-- 青/蓝色渐变 -->
            <div
              class="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"
            ></div>
            <img
              src="/images/about.webp"
              alt="Kuroome"
              class="relative h-32 w-32 transform transform-gpu rounded-full border-4 border-white object-cover shadow-xl transition duration-500 group-hover:scale-105 dark:border-gray-700"
            />
            <RouterLink
              to="/about"
              class="absolute inset-0 rounded-full"
            ></RouterLink>
          </div>

          <!-- Name -->
          <h2 class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
            Kuroome
          </h2>

          <!-- Role/Title Badge -->
          <div class="mb-4">
            <span
              class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              Developer & Student
            </span>
          </div>

          <!-- Bio/Bullet Points -->
          <div
            class="mt-2 w-full space-y-3 text-left text-sm text-gray-600 dark:text-gray-300"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"
              ></span>
              <span>国际政治专业在读学生</span>
            </div>
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400"
              ></span>
              <span>正在自学编程与开发</span>
            </div>
            <div class="flex items-start gap-3">
              <span
                class="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400"
              ></span>
              <span>爱好编程、阅读、钓鱼等</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tech Stack Card -->
      <div
        class="rounded-3xl border border-gray-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80"
      >
        <h3
          class="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase"
        >
          Tech Stack
        </h3>
        <div class="flex flex-wrap gap-2">
          <span
            class="cursor-default rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            Python
          </span>
          <span
            class="cursor-default rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
          >
            JS/TS
          </span>
          <span
            class="cursor-default rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
          >
            (API)Flask
          </span>
          <span
            class="cursor-default rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
          >
            Vue.js
          </span>
          <span
            class="cursor-default rounded-md bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            TailwindCss
          </span>
          <span
            class="cursor-default rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            PostgreSQL
          </span>
          <span
            class="cursor-default rounded-md bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
          >
            SQLAlchemy
          </span>
          <span
            class="cursor-default rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            FastAPI
          </span>
          <span
            class="cursor-default rounded-md bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
          >
            Pandas
          </span>
          <span
            class="cursor-default rounded-md bg-fuchsia-100 px-2.5 py-1 text-xs font-medium text-fuchsia-700 transition-colors hover:bg-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/50"
          >
            MONGODB
          </span>
        </div>
      </div>
      <div>
        <img
          class="cat mx-auto mt-12 aspect-auto size-48 transform transform-gpu rounded-3xl shadow-2xl transition-transform hover:scale-105 hover:rotate-2"
          src="/images/cat.webp"
          alt="Cat Image"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
