<template>
  <aside class="w-full lg:w-72 lg:shrink-0">
    <div
      class="rounded-3xl bg-white/80 p-6 shadow-md dark:border dark:border-gray-700/50 dark:bg-gray-900/80 dark:shadow-none"
    >
      <h3 class="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-gray-800 italic dark:text-white">
        <IconTags class="size-5!"></IconTags>
        Tags
      </h3>
      <ul class="space-y-2">
        <!-- 全部文章选项 -->
        <li>
          <button
            @click="selectCategory(null)"
            :class="[
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
              activeCategoryId === null
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
            ]"
          >
            <p class="flex items-center gap-2">
              <IconTags></IconTags>
              全部文章
            </p>
            <span
              v-if="totalPosts !== null"
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300"
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
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
            ]"
          >
            <p class="flex items-center gap-2">
              <IconTags></IconTags>
              {{ category.name }}
            </p>
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300"
            >
              {{ category.post_count || 0 }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { blogService } from "@/service/blogService";
import IconTags from "@/components/icons/IconTags.vue";
import type { Category, CategoryResponseItem, Post } from "@/types";
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
const route = useRoute();
const router = useRouter();

const categories = ref<Category[]>([]);
const activeCategoryId = ref<number | null>(null);
const isLoading = ref(false);
const totalPosts = ref<number | null>(null);

const emit = defineEmits<{
  filterPosts: [posts: Post[], categoryName: string];
  resetFilter: [];
}>();

onMounted(() => {
  fetchCategories();
  // 从 URL 参数恢复选中的分类
  const categoryId = route.query.category;
  if (categoryId) {
    activeCategoryId.value = parseInt(categoryId as string, 10);
    fetchPostsByCategory(activeCategoryId.value);
  }
});

// 监听 URL 变化
watch(
  () => route.query.category,
  (newCategoryId) => {
    if (newCategoryId) {
      activeCategoryId.value = parseInt(newCategoryId as string, 10);
      fetchPostsByCategory(activeCategoryId.value);
    } else {
      activeCategoryId.value = null;
      emit("resetFilter");
    }
  },
);

const fetchCategories = async () => {
  try {
    const response = await blogService.getLegacyCategories();
    categories.value = response.map(
      (cat): CategoryResponseItem => ({
        id: cat.id,
        name: cat.name,
        description: "",
        post_count: cat.post_count || 0,
        posts: [],
      }),
    ) as unknown as Category[];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
  }
};

const fetchPostsByCategory = async (categoryId: number) => {
  isLoading.value = true;
  try {
    const response = await blogService.getPostsByLegacyCategory(categoryId);
    const posts: Post[] = response.posts.map((post) => ({
      ...(post as unknown as Post),
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            description: "",
            post_count: 0,
            created_at: "",
            updated_at: "",
          }
        : undefined,
    }));
    const categoryName = response.category?.name || "";
    emit("filterPosts", posts, categoryName);
  } catch (error) {
    console.error("Failed to fetch posts by category:", error);
  } finally {
    isLoading.value = false;
  }
};

const selectCategory = (categoryId: number | null) => {
  activeCategoryId.value = categoryId;

  // 更新 URL，但不刷新页面
  if (categoryId !== null) {
    router.replace({ query: { category: categoryId.toString() } });
    fetchPostsByCategory(categoryId);
  } else {
    const query = { ...route.query };
    delete query.category;
    router.replace({ query });
    emit("resetFilter");
  }
};
</script>
