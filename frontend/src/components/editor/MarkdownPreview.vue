<script setup lang="ts">
import { computed, ref, watch } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

// Props
const props = defineProps<{
  content: string;
  syncScroll?: boolean;
}>();

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

// 渲染 Markdown 内容
const renderedContent = computed(() => {
  if (!props.content) return "";
  const rawHtml = md.render(props.content);
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "rel"],
    ADD_TAGS: ["iframe"],
  });
});

// 同步滚动
const previewRef = ref<HTMLElement | null>(null);
const lastScrollTop = ref(0);

// 接收外部滚动事件
const handleExternalScroll = (scrollTop: number, scrollHeight: number) => {
  if (!previewRef.value || !props.syncScroll) return;

  const previewHeight = previewRef.value.scrollHeight;
  const previewClientHeight = previewRef.value.clientHeight;
  const scrollRatio = scrollTop / (scrollHeight - previewClientHeight);
  const newScrollTop = scrollRatio * (previewHeight - previewClientHeight);

  previewRef.value.scrollTop = newScrollTop;
  lastScrollTop.value = newScrollTop;
};

// 暴露方法给父组件
defineExpose({
  handleExternalScroll,
});

// 预览模式
const previewMode = ref<"preview" | "source">("preview");
</script>

<template>
  <div
    class="markdown-preview flex flex-col border-l border-gray-200/60 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90"
  >
    <!-- 预览头部 -->
    <div
      class="flex items-center justify-between border-b border-gray-200/60 px-4 py-2 dark:border-gray-700/60"
    >
      <div class="flex items-center gap-2">
        <svg
          class="h-4 w-4 text-gray-500 dark:text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Preview
        </span>
      </div>

      <!-- 模式切换 -->
      <div
        class="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 dark:bg-gray-800"
      >
        <button
          type="button"
          @click="previewMode = 'preview'"
          :class="[
            'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
            previewMode === 'preview'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          ]"
        >
          Preview
        </button>
        <button
          type="button"
          @click="previewMode = 'source'"
          :class="[
            'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
            previewMode === 'source'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          ]"
        >
          Source
        </button>
      </div>
    </div>

    <!-- 预览内容 -->
    <div ref="previewRef" class="flex-1 overflow-y-auto p-4">
      <!-- 渲染预览 -->
      <div
        v-if="previewMode === 'preview'"
        class="prose prose-sm dark:prose-invert max-w-none"
        v-html="renderedContent"
      ></div>

      <!-- 源代码视图 -->
      <div v-else class="font-mono text-sm text-gray-800 dark:text-gray-200">
        <pre class="whitespace-pre-wrap">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
.markdown-preview ::-webkit-scrollbar {
  width: 6px;
}

.markdown-preview ::-webkit-scrollbar-track {
  background: transparent;
}

.markdown-preview ::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.markdown-preview ::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

/* 代码块样式 */
.markdown-preview :deep(pre) {
  background-color: rgb(243 244 246 / 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.dark .markdown-preview :deep(pre) {
  background-color: rgb(31 41 55 / 0.5);
}

.markdown-preview :deep(code) {
  font-family:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono",
    monospace;
  font-size: 0.875em;
}

.markdown-preview :deep(:not(pre) > code) {
  background-color: rgb(243 244 246);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
}

.dark .markdown-preview :deep(:not(pre) > code) {
  background-color: rgb(55 65 81);
}

/* 表格样式 */
.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid rgb(229 231 235);
  padding: 0.5rem 0.75rem;
}

.dark .markdown-preview :deep(th),
.dark .markdown-preview :deep(td) {
  border-color: rgb(75 85 99);
}

.markdown-preview :deep(th) {
  background-color: rgb(249 250 251);
  font-weight: 600;
}

.dark .markdown-preview :deep(th) {
  background-color: rgb(31 41 55);
}

/* 链接样式 */
.markdown-preview :deep(a) {
  color: rgb(59 130 246);
  text-decoration: underline;
}

.markdown-preview :deep(a:hover) {
  color: rgb(37 99 235);
}

/* 图片样式 */
.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

/* 引用样式 */
.markdown-preview :deep(blockquote) {
  border-left: 4px solid rgb(209 213 219);
  margin: 1rem 0;
  padding-left: 1rem;
  color: rgb(107 114 128);
}

.dark .markdown-preview :deep(blockquote) {
  border-color: rgb(75 85 99);
  color: rgb(156 163 175);
}

/* 列表样式 */
.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.markdown-preview :deep(li) {
  margin: 0.25rem 0;
}

/* 标题样式 */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.markdown-preview :deep(h1) {
  font-size: 1.5rem;
  border-bottom: 1px solid rgb(229 231 235);
  padding-bottom: 0.5rem;
}

.dark .markdown-preview :deep(h1) {
  border-color: rgb(75 85 99);
}

.markdown-preview :deep(h2) {
  font-size: 1.25rem;
}

.markdown-preview :deep(h3) {
  font-size: 1.125rem;
}
</style>
