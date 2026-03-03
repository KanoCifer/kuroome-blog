<template>
  <BentoCard>
    <nav class="flex flex-col gap-3">
      <a
        v-for="item in navItems"
        :key="item.name"
        :href="item.href"
        class="group flex items-center gap-4 rounded-2xl p-3 transition-all hover:bg-white/60 hover:shadow-sm"
      >
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-orange-600 transition-colors group-hover:bg-orange-200 group-hover:text-orange-700"
        >
          <svg
            v-if="item.icon === 'article'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'project'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          <svg
            v-else-if="item.icon === 'about'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div class="flex flex-col">
          <span
            class="text-base font-semibold text-slate-800 transition-colors group-hover:text-slate-900"
          >
            {{ item.name }}
          </span>
          <span class="text-sm text-slate-500">
            {{ item.description }}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="ml-auto h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-orange-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </nav>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "./BentoCard.vue";

const navItems = [
  {
    name: "Recent Articles",
    description: "My latest writings",
    href: "#",
    icon: "article",
  },
  {
    name: "My Projects",
    description: "Things I've built",
    href: "#",
    icon: "project",
  },
  {
    name: "About Me",
    description: "Who am I?",
    href: "#",
    icon: "about",
  },
];
</script>
