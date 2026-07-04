<template>
  <aside class="w-full lg:w-72 lg:shrink-0">
    <div
      class="rounded-3xl bg-white/80 p-6 shadow-md dark:border dark:border-gray-700/50 dark:bg-gray-900/80 dark:shadow-none"
    >
      <h3
        class="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-gray-800 italic dark:text-white"
      >
        <IconTags class="size-5!"></IconTags>
        Tags
      </h3>
      <p v-if="isLoading" class="text-muted-foreground text-sm">加载中…</p>
      <p
        v-else-if="tags.length === 0"
        class="text-muted-foreground text-sm"
      >
        暂无标签
      </p>
      <ul v-else class="flex flex-wrap gap-2">
        <li>
          <button
            @click="selectTag(null)"
            :class="[
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              activeTag === null
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
            ]"
          >
            全部文章
          </button>
        </li>
        <li v-for="tag in tags" :key="tag.name">
          <button
            @click="selectTag(tag.name)"
            :class="[
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors',
              activeTag === tag.name
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
            ]"
          >
            {{ tag.name }}
            <span class="text-xs opacity-60">{{ tag.count }}</span>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { blogGateway } from '@/api/public';
import IconTags from '@/components/icons/IconTags.vue';
import type { BlogPost, Post, TagItem } from '@/types';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

const tags = ref<TagItem[]>([]);
const activeTag = ref<string | null>(null);
const isLoading = ref(false);

const emit = defineEmits<{
  filterPosts: [posts: Post[], tagName: string];
  resetFilter: [];
}>();

onMounted(async () => {
  await fetchTags();
  const tag = route.query.tag;
  if (typeof tag === 'string' && tag) {
    activeTag.value = tag;
    await fetchPostsByTag(tag);
  }
});

watch(
  () => route.query.tag,
  async (newTag) => {
    if (typeof newTag === 'string' && newTag) {
      activeTag.value = newTag;
      await fetchPostsByTag(newTag);
    } else if (newTag === undefined || newTag === null || newTag === '') {
      activeTag.value = null;
      emit('resetFilter');
    }
  },
);

const fetchTags = async () => {
  isLoading.value = true;
  try {
    tags.value = await blogGateway.getTags();
  } catch (error) {
    console.error('Failed to fetch tags:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchPostsByTag = async (tag: string) => {
  isLoading.value = true;
  try {
    const response = await blogGateway.getPostsByTag(tag);
    const posts: BlogPost[] = response.posts as unknown as BlogPost[];
    emit('filterPosts', posts as unknown as Post[], tag);
  } catch (error) {
    console.error('Failed to fetch posts by tag:', error);
  } finally {
    isLoading.value = false;
  }
};

const selectTag = (tag: string | null) => {
  activeTag.value = tag;
  if (tag !== null) {
    router.replace({ query: { ...route.query, tag } });
    fetchPostsByTag(tag);
  } else {
    const query = { ...route.query };
    delete query.tag;
    router.replace({ query });
    emit('resetFilter');
  }
};
</script>
