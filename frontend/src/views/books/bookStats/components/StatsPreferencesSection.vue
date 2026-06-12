<script setup lang="ts">
import type {
  PreferAuthorItem,
  PreferCategoryItem,
  PreferPublisherItem,
} from '@/api/wereadGateway';

defineProps<{
  categories: (PreferCategoryItem & { share: number })[];
  authors: PreferAuthorItem[];
  publishers: PreferPublisherItem[];
}>();
</script>

<template>
  <section class="mb-14">
    <h2
      class="text-foreground mb-6 font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
    >
      你偏好的
    </h2>
    <dl class="space-y-5 text-sm sm:text-base">
      <div
        v-if="categories.length"
        class="grid grid-cols-[5rem_1fr] gap-x-5 gap-y-1 sm:grid-cols-[6rem_1fr]"
      >
        <dt class="text-muted-foreground pt-1">品类</dt>
        <dd class="flex flex-wrap gap-x-3 gap-y-1.5">
          <span
            v-for="cat in categories"
            :key="cat.categoryTitle"
            class="text-foreground"
          >
            <span class="font-serif">{{ cat.categoryTitle }}</span>
            <span class="text-muted-foreground ml-1 text-xs tabular-nums">
              {{ Math.round(cat.share * 100) }}%
            </span>
          </span>
        </dd>
      </div>

      <div
        v-if="authors.length"
        class="grid grid-cols-[5rem_1fr] gap-x-5 gap-y-1 sm:grid-cols-[6rem_1fr]"
      >
        <dt class="text-muted-foreground pt-1">作者</dt>
        <dd class="flex flex-wrap gap-x-3 gap-y-1.5">
          <span
            v-for="(author, idx) in authors"
            :key="author.authorId ?? idx"
            class="text-foreground"
          >
            <span class="font-serif">
              {{ author.name ?? '未知' }}
            </span>
            <span
              v-if="author.readingTime"
              class="text-muted-foreground ml-1 text-xs"
            >
              {{ author.readingTime }}
            </span>
          </span>
        </dd>
      </div>

      <div
        v-if="publishers.length"
        class="grid grid-cols-[5rem_1fr] gap-x-5 gap-y-1 sm:grid-cols-[6rem_1fr]"
      >
        <dt class="text-muted-foreground pt-1">出版社</dt>
        <dd class="flex flex-wrap gap-x-3 gap-y-1.5">
          <span
            v-for="(pub, idx) in publishers"
            :key="pub.name ?? idx"
            class="text-foreground"
          >
            <span class="font-serif">{{ pub.name ?? '未知' }}</span>
            <span
              v-if="pub.count"
              class="text-muted-foreground ml-1 text-xs tabular-nums"
            >
              {{ pub.count }} 本
            </span>
          </span>
        </dd>
      </div>
    </dl>
  </section>
</template>
