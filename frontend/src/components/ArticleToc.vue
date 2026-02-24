<template>
  <aside class="w-full lg:w-64 lg:shrink-0">
    <div
      v-if="toc.length > 0"
      class="sticky top-24 rounded-3xl bg-white p-5 shadow-md dark:border dark:border-gray-700/50 dark:bg-gray-900 dark:shadow-none"
    >
      <h3
        class="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-gray-800 dark:text-white"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        目录
      </h3>
      <nav class="max-h-[60vh] space-y-1 overflow-y-auto pr-2">
        <button
          v-for="item in toc"
          :key="item.id"
          @click="scrollToHeading(item.id)"
          :class="[
            'group flex w-full items-start rounded-lg px-3 py-2 text-left text-sm transition-all',
            activeId === item.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
          ]"
          :style="{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }"
        >
          <span class="line-clamp-2">{{ item.text }}</span>
        </button>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import type { TocItem } from "@/types";

const props = defineProps<{
  content: string;
}>();

const toc = ref<TocItem[]>([]);
const activeId = ref<string>("");

// 生成标题 ID
const generateId = (index: number, text: string): string => {
  return `heading-${index}-${text.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
};

// 从 HTML 内容中提取标题
const extractHeadings = (html: string): TocItem[] => {
  const headings: TocItem[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const elements = doc.querySelectorAll("h1, h2, h3");
  elements.forEach((el, index) => {
    const text = el.textContent?.trim() || "";
    if (text) {
      const level = parseInt(el.tagName.charAt(1));
      const id = generateId(index, text);
      headings.push({ id, text, level });
    }
  });

  return headings;
};

// 为文章中的标题元素添加 ID
const addIdsToHeadings = () => {
  // 查找文章内容容器中的标题元素
  const contentContainer = document.querySelector(".prose");
  if (!contentContainer) return;

  const headingElements = contentContainer.querySelectorAll("h1, h2, h3");
  headingElements.forEach((el, index) => {
    const text = el.textContent?.trim() || "";
    if (text && !el.id) {
      el.id = generateId(index, text);
    }
  });
};

// 初始化标题 ID
const initHeadings = async () => {
  if (!props.content) return;
  toc.value = extractHeadings(props.content);
  await nextTick();
  // 多次尝试确保 DOM 渲染完成
  setTimeout(addIdsToHeadings, 50);
  setTimeout(addIdsToHeadings, 200);
  setTimeout(addIdsToHeadings, 500);
};

watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      initHeadings();
    } else {
      toc.value = [];
      activeId.value = "";
    }
  },
  { immediate: true },
);

const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    const offset = 100;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    activeId.value = id;
  }
};

// 监听滚动，更新当前激活的目录项
const handleScroll = () => {
  if (toc.value.length === 0) return;

  // 重新查找标题元素（因为 DOM 可能已更新）
  const contentContainer = document.querySelector(".prose");
  if (!contentContainer) return;

  const headingElements: HTMLElement[] = [];
  toc.value.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) headingElements.push(el);
  });

  if (headingElements.length === 0) return;

  const scrollPosition = window.scrollY + 120;

  // 找到最后一个在滚动位置之上的标题
  let foundIndex = -1;
  for (let i = headingElements.length - 1; i >= 0; i--) {
    const el = headingElements[i];
    if (el && el.offsetTop <= scrollPosition) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex >= 0) {
    const tocItem = toc.value[foundIndex];
    if (tocItem) {
      activeId.value = tocItem.id;
    }
  } else if (
    headingElements.length > 0 &&
    headingElements[0] &&
    scrollPosition < headingElements[0].offsetTop &&
    toc.value.length > 0 &&
    toc.value[0]
  ) {
    activeId.value = toc.value[0].id;
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  // 延迟初始化确保 DOM 已渲染
  setTimeout(() => {
    addIdsToHeadings();
    handleScroll();
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style scoped>
/* 自定义滚动条 */
nav::-webkit-scrollbar {
  width: 4px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background-color: rgb(209 213 219);
  border-radius: 4px;
}

.dark nav::-webkit-scrollbar-thumb {
  background-color: rgb(75 85 99);
}
</style>
