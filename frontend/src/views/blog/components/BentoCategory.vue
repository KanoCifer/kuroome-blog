<template>
  <BentoCard>
    <div class="p-4">
      <h3
        class="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase"
      >
        Tags
      </h3>
      <ul class="space-y-1">
        <!-- 全部文章 -->
        <li>
          <button
            @click="selectCategory(null)"
            :class="[
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              activeCategoryId === null
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            <span class="flex items-center gap-2">
              <IconTags class="size-4" />
              全部文章
            </span>
            <span
              v-if="totalPosts !== null"
              class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {{ totalPosts }}
            </span>
          </button>
        </li>
        <!-- 分类列表 -->
        <li v-for="category in categories" :key="category.id">
          <button
            @click="selectCategory(category.id)"
            :class="[
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              activeCategoryId === category.id
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            <span class="flex items-center gap-2">
              <IconTags class="size-4" />
              {{ category.name }}
            </span>
            <span
              class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {{ category.post_count || 0 }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from '@/components/bento/BentoCard.vue';
import IconTags from '@/components/icons/IconTags.vue';
import { blogGateway } from '@/api/public';
import type { Category, CategoryResponseItem, Post } from '@/types';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const categories = ref<Category[]>([]);
const activeCategoryId = ref<number | null>(null);
const totalPosts = ref<number | null>(null);

const emit = defineEmits<{
  filterPosts: [posts: Post[], categoryName: string];
  resetFilter: [];
}>();

onMounted(() => {
  fetchCategories();
  const categoryId = route.query.category;
  if (categoryId) {
    activeCategoryId.value = parseInt(categoryId as string, 10);
    fetchPostsByCategory(activeCategoryId.value);
  }
});

watch(
  () => route.query.category,
  (newCategoryId) => {
    if (newCategoryId) {
      activeCategoryId.value = parseInt(newCategoryId as string, 10);
      fetchPostsByCategory(activeCategoryId.value);
    } else {
      activeCategoryId.value = null;
      emit('resetFilter');
    }
  },
);

const fetchCategories = async () => {
  try {
    const response = await blogGateway.getLegacyCategories();
    categories.value = response.map((cat): CategoryResponseItem => ({
      id: cat.id,
      name: cat.name,
      description: '',
      post_count: cat.post_count || 0,
      posts: [],
    })) as unknown as Category[];
    totalPosts.value = response.reduce(
      (sum, cat) => sum + (cat.post_count || 0),
      0,
    );
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const fetchPostsByCategory = async (categoryId: number) => {
  try {
    const response = await blogGateway.getPostsByLegacyCategory(categoryId);
    const posts: Post[] = response.posts.map((post) => ({
      ...(post as unknown as Post),
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            description: '',
            post_count: 0,
            created_at: '',
            updated_at: '',
          }
        : undefined,
    }));
    const categoryName = response.category?.name || '';
    emit('filterPosts', posts, categoryName);
  } catch (error) {
    console.error('Failed to fetch posts by category:', error);
  }
};

const selectCategory = (categoryId: number | null) => {
  activeCategoryId.value = categoryId;

  if (categoryId !== null) {
    router.replace({ query: { category: categoryId.toString() } });
    fetchPostsByCategory(categoryId);
  } else {
    const query = { ...route.query };
    delete query.category;
    router.replace({ query });
    emit('resetFilter');
  }
};
</script>
