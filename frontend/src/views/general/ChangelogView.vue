<script setup lang="ts">
import changelog from "@/data/changelog.json";
import { motion } from "motion-v";
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    feat: "新功能",
    fix: "修复",
    refactor: "重构",
    style: "样式",
    docs: "文档",
    perf: "性能",
    test: "测试",
    chore: "构建",
  };
  return labels[type] || type;
};

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    feat: "✨",
    fix: "🐛",
    refactor: "♻️",
    style: "🎨",
    docs: "📝",
    perf: "⚡",
    test: "🧪",
    chore: "🔧",
  };
  return icons[type] || "";
};

const getTypeClass = (type: string): string => {
  const classes: Record<string, string> = {
    feat: "bg-linear-to-r from-green-100 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60",
    fix: "bg-linear-to-r from-red-100 to-rose-100 text-rose-700 ring-1 ring-rose-200/60 dark:from-red-900/30 dark:to-rose-900/30 dark:text-rose-300 dark:ring-rose-800/60",
    refactor:
      "bg-linear-to-r from-purple-100 to-violet-100 text-violet-700 ring-1 ring-violet-200/60 dark:from-purple-900/30 dark:to-violet-900/30 dark:text-violet-300 dark:ring-violet-800/60",
    style:
      "bg-linear-to-r from-pink-100 to-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200/60 dark:from-pink-900/30 dark:to-fuchsia-900/30 dark:text-fuchsia-300 dark:ring-fuchsia-800/60",
    docs: "bg-linear-to-r from-blue-100 to-sky-100 text-sky-700 ring-1 ring-sky-200/60 dark:from-blue-900/30 dark:to-sky-900/30 dark:text-sky-300 dark:ring-sky-800/60",
    perf: "bg-linear-to-r from-amber-100 to-orange-100 text-orange-700 ring-1 ring-orange-200/60 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-orange-300 dark:ring-orange-800/60",
    test: "bg-linear-to-r from-cyan-100 to-teal-100 text-teal-700 ring-1 ring-teal-200/60 dark:from-cyan-900/30 dark:to-teal-900/30 dark:text-teal-300 dark:ring-teal-800/60",
    chore:
      "bg-linear-to-r from-gray-100 to-slate-100 text-slate-700 ring-1 ring-slate-200/60 dark:from-gray-900/30 dark:to-slate-900/30 dark:text-slate-300 dark:ring-slate-800/60",
  };
  return classes[type] ?? classes.chore ?? "";
};
</script>

<template>
  <div
    id="changelogView"
    class="my-12 flex min-h-full w-full flex-col items-center justify-center py-12"
  >
    <div class="w-full max-w-5xl px-4">
      <!-- Header Section -->
      <div class="mb-16 text-center">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          版本更新记录
        </div>
        <h1
          class="mb-4 text-5xl font-bold tracking-tight text-gray-800 md:text-6xl dark:text-gray-100"
        >
          变更日志
        </h1>
        <p class="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          记录网站的每一次成长与进步
        </p>
      </div>

      <!-- Timeline -->
      <div class="relative">
        <!-- Center timeline line -->
        <div
          class="absolute top-0 left-1/2 hidden h-full w-0.5 -translate-x-1/2 bg-linear-to-b from-blue-400 via-purple-400 to-pink-400 md:block"
        ></div>

        <!-- Releases -->
        <div class="space-y-12">
          <motion.div
            :initial="{ opacity: 0, y: 40 }"
            :whileInView="{ opacity: 1, y: 0 }"
            :transition="{
              type: 'spring',
              duration: 1,
              stiffness: 100,
              damping: 20,
            }"
            v-for="(r, i) in changelog"
            :key="r.version"
            :class="[
              'relative flex items-center',
              i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse',
            ]"
          >
            <!-- Content Card -->
            <div class="-mx-8 w-full md:w-1/2">
              <div
                class="group squircle cursor-pointer border border-gray-100 bg-white/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-8 dark:border-gray-700 dark:bg-gray-800/80"
              >
                <!-- Version Badge & Date -->
                <div class="mb-4 flex flex-wrap items-center gap-3">
                  <span
                    class="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/25"
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    v{{ r.version }}
                  </span>
                  <span
                    class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {{ r.date }}
                  </span>
                </div>

                <!-- Release Title -->
                <h2
                  class="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100"
                >
                  {{ r.title }}
                </h2>

                <!-- Changes List -->
                <ul class="space-y-3">
                  <li
                    v-for="(change, i) in r.changes"
                    :key="i"
                    class="flex items-start gap-3"
                  >
                    <span
                      :class="[
                        'mt-0.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide uppercase transition-all duration-200',
                        getTypeClass(change.type),
                      ]"
                    >
                      <span v-if="getTypeIcon(change.type)">{{
                        getTypeIcon(change.type)
                      }}</span>
                      {{ getTypeLabel(change.type) }}
                    </span>
                    <span class="text-gray-700 dark:text-gray-300">
                      {{ change.content }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Timeline Dot -->
            <div
              class="absolute top-1/2 left-1/2 z-10 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 md:block"
            >
              <div
                class="absolute inset-0 -m-2 rounded-full bg-blue-500 opacity-30 blur-md transition-all duration-300 group-hover:opacity-50 group-hover:blur-lg"
              ></div>
              <div
                class="relative flex h-full w-full items-center justify-center rounded-full bg-white ring-4 ring-blue-100 dark:bg-gray-800 dark:ring-gray-700"
              >
                <div class="h-3 w-3 rounded-full bg-blue-400"></div>
              </div>
            </div>

            <!-- Mobile Timeline Dot -->
            <div
              class="absolute top-6 left-0 z-10 h-6 w-6 -translate-x-1/2 md:hidden"
            >
              <div
                class="relative flex h-full w-full items-center justify-center rounded-full bg-white ring-3 ring-blue-100 dark:bg-gray-800 dark:ring-gray-700"
              >
                <div class="h-2 w-2 rounded-full bg-blue-400"></div>
              </div>
            </div>

            <!-- Spacer for alignment -->
            <div class="hidden md:block md:w-5/12"></div>
          </motion.div>
        </div>
      </div>
    </div>
  </div>
</template>
