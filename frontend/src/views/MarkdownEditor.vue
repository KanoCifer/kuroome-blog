<script setup lang="ts">
import { ref, computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import BasicDetail from "@/components/basic/BasicDetail.vue";

const markdownText = ref<string>("");

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderedMarkdown = computed<string>(() => {
  if (!markdownText.value) return "";
  const rawHtml = marked.parse(markdownText.value, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
});
</script>

<template>
  <BasicDetail title="Markdown 编辑器" subtitle="实时预览">
    <div class="col-span-full h-[700px] overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
      <div class="flex h-full w-full flex-col md:flex-row">
        <!-- Left Column: Editor -->
        <div class="flex h-1/2 w-full flex-col border-b border-slate-200 md:h-full md:w-1/2 md:border-b-0 md:border-r dark:border-slate-800">
          <div class="flex h-12 flex-shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800">
            <h1 class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">MARKDOWN</h1>
          </div>
          <textarea
            v-model="markdownText"
            class="flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed outline-none placeholder:text-slate-300 focus:ring-0 dark:placeholder:text-slate-700"
            placeholder="# Welcome to Markdown Editor&#10;&#10;Type some Markdown here...&#10;&#10;- Lists&#10;- **Bold text**&#10;- *Italic text*&#10;&#10;```js&#10;console.log('Hello World!');&#10;```"
          ></textarea>
        </div>

        <!-- Right Column: Preview -->
        <div class="flex h-1/2 w-full flex-col md:h-full md:w-1/2">
          <div class="flex h-12 flex-shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800">
            <h2 class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">PREVIEW</h2>
          </div>
          <!-- Use Tailwind Typography plugin (prose) for styling the markdown output -->
          <div class="prose prose-slate dark:prose-invert max-w-none flex-1 overflow-y-auto p-6">
            <div v-html="renderedMarkdown"></div>
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<style scoped>
/* No custom CSS needed, utilizing Tailwind Typography plugin via 'prose' */
</style>
