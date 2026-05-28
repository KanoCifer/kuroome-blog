<template>
  <aside class="w-full lg:w-64 lg:shrink-0">
    <div v-if="toc.length > 0" class="sticky top-24 rounded-3xl p-5 shadow-md">
      <h3
        class="text-foreground mb-4 flex items-center gap-2 font-serif text-base font-semibold"
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
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
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
// ArticleToc.vue 目录组件的逻辑部分，使用 Vue 3 的 <script setup> 语法。
// 该组件接收渲染后的文章 HTML 内容，通过解析出 h1/h2/h3 标题构建目录，
// 并为文章中的标题添加 id 以支持点击跳转和滚动高亮。

import type { TocItem } from '@/types';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

// 定义组件 props，content 为传入的文章 HTML 字符串
const props = defineProps<{
  content: string;
}>();

// toc 存放解析出的目录条目列表，activeId 保存当前滚动位置对应的标题 id
const toc = ref<TocItem[]>([]);
const activeId = ref<string>('');

// 辅助函数
//---------
// 生成一个唯一的 id，用于给 heading 元素和目录项排序使用
// index 是标题在文档中的顺序，text 为标题文本的一部分
const generateId = (index: number, text: string): string => {
  // 只取前 20 个字符，去除空白并用 '-' 连接，确保 id 合法
  return `heading-${index}-${text.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
};

// 根据传入的 HTML 字符串，提取出所有 h1/h2/h3 标题，返回目录条目数组
const extractHeadings = (html: string): TocItem[] => {
  const headings: TocItem[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // querySelectorAll 返回 NodeList，我们遍历并构造 TocItem
  const elements = doc.querySelectorAll('h1, h2, h3');
  elements.forEach((el, index) => {
    const text = el.textContent?.trim() || '';
    if (text) {
      const level = parseInt(el.tagName.charAt(1)); // 'H2' -> 2
      const id = generateId(index, text);
      headings.push({ id, text, level });
    }
  });

  return headings;
};

// 给页面中实际渲染的 heading 元素添加对应的 id，方便跳转和定位
const addIdsToHeadings = () => {
  // 文章容器在样式中使用了 .prose 类
  const contentContainer = document.querySelector('.prose');
  if (!contentContainer) return;

  const headingElements = contentContainer.querySelectorAll('h1, h2, h3');
  headingElements.forEach((el, index) => {
    const text = el.textContent?.trim() || '';
    // 若已有 id 则跳过，防止重复赋值
    if (text && !el.id) {
      el.id = generateId(index, text);
    }
  });
};

// 初始化目录并尝试给 DOM 元素绑定 id
const initHeadings = async () => {
  if (!props.content) return;
  // 先从 content 字符串中提取目录数据
  toc.value = extractHeadings(props.content);
  await nextTick();
  // DOM 渲染后多次尝试，以保证内容节点存在
  setTimeout(addIdsToHeadings, 50);
  setTimeout(addIdsToHeadings, 200);
  setTimeout(addIdsToHeadings, 500);
};

// -----------------------------------------------------------------------------
// 响应 props.content 变化
// -----------------------------------------------------------------------------
watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      initHeadings();
    } else {
      // 如果 content 为空，则清空目录和激活状态
      toc.value = [];
      activeId.value = '';
    }
  },
  { immediate: true }, // 组件挂载时立即触发一次
);

// -----------------------------------------------------------------------------
// 用户交互相关
// -----------------------------------------------------------------------------

// 点击目录按钮时滚动到对应标题位置，同时设置 activeId
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    activeId.value = id;
    window.history.pushState(null, '', `#${id}`); // 更新 URL 中的 hash，便于分享链接
  }
};

// 监听hash变化（例如用户使用浏览器的前进/后退按钮），更新 activeId 以保持目录高亮同步
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1); // 去掉 '#' 前缀
  if (hash) {
    scrollToHeading(hash);
  }
});

// 监听页面滚动，根据当前滚动位置更新 activeId
const handleScroll = () => {
  if (toc.value.length === 0) return;

  const contentContainer = document.querySelector('.prose');
  if (!contentContainer) return;

  const headingElements: HTMLElement[] = [];
  // 由于 DOM 可能已经发生变化，重新查找一遍当前所有标题元素
  toc.value.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) headingElements.push(el);
  });

  if (headingElements.length === 0) return;

  const scrollPosition = window.scrollY + 120; // 与上面 offset 保持一致

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
    // 如果滚动位置在第一个标题之前，让第一个目录项高亮
    activeId.value = toc.value[0].id;
  }
};

// -----------------------------------------------------------------------------
// 生命周期钩子
// -----------------------------------------------------------------------------

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  // 挂载后短暂延迟再尝试标记标题，避免异步渲染延迟
  setTimeout(() => {
    addIdsToHeadings();
    handleScroll();
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
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
