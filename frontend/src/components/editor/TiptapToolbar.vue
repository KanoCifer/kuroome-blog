<script setup lang="ts">
import type { Editor } from "@tiptap/core";
import { computed, ref } from "vue";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

const tableMenuOpen = ref(false);
const headingMenuOpen = ref(false);

// 计算当前选中的标题类型
const currentHeading = computed(() => {
  if (props.editor.isActive("heading", { level: 2 })) {
    return "H1";
  } else if (props.editor.isActive("heading", { level: 3 })) {
    return "H2";
  } else if (props.editor.isActive("heading", { level: 4 })) {
    return "H3";
  } else {
    return "Paragraph";
  }
});

const insertTable = (rows: number, cols: number) => {
  props.editor
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: true })
    .run();
  tableMenuOpen.value = false;
};

const deleteTable = () => {
  props.editor.chain().focus().deleteTable().run();
};

const addColumnBefore = () => {
  props.editor.chain().focus().addColumnBefore().run();
};

const addColumnAfter = () => {
  props.editor.chain().focus().addColumnAfter().run();
};

const deleteColumn = () => {
  props.editor.chain().focus().deleteColumn().run();
};

const addRowBefore = () => {
  props.editor.chain().focus().addRowBefore().run();
};

const addRowAfter = () => {
  props.editor.chain().focus().addRowAfter().run();
};

const deleteRow = () => {
  props.editor.chain().focus().deleteRow().run();
};

const mergeCells = () => {
  props.editor.chain().focus().mergeCells().run();
};

const splitCell = () => {
  props.editor.chain().focus().splitCell().run();
};

const toggleHeaderRow = () => {
  props.editor.chain().focus().toggleHeaderRow().run();
};

const toggleBold = () => {
  props.editor.chain().focus().toggleBold().run();
};

const setLink = () => {
  const previousUrl = props.editor.getAttributes("link").href;
  const url = window.prompt("Enter URL:", previousUrl || "https://");
  if (url === null) return;
  if (url === "") {
    props.editor.chain().focus().extendMarkRange("link").unsetLink().run();
  } else {
    props.editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }
};

const addImage = () => {
  const url = window.prompt("Enter image URL:", "https://");
  if (url) {
    props.editor.chain().focus().setImage({ src: url }).run();
  }
};
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
  >
    <!-- Text Style Group -->
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        @click="toggleBold"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="Bold (Ctrl+B)"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="Italic (Ctrl+I)"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10 4h4m-2 0l-4 16m0 0h4M8 20h4"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ 'is-active': editor.isActive('underline') }"
        title="Underline (Ctrl+U)"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 4v7a5 5 0 0010 0V4M5 20h14"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="Strikethrough"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16 4H9a3 3 0 000 6h2m4 0H9a3 3 0 000 6h7M4 12h16"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        title="Inline Code"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17.25 6.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </button>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- Heading Group - Dropdown -->
    <div class="flex items-center gap-0.5">
      <div class="relative">
        <button
          type="button"
          @click="headingMenuOpen = !headingMenuOpen"
          class="tiptap-btn flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          title="Text Style"
        >
          <span>{{ currentHeading }}</span>
          <svg
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
        <div
          v-if="headingMenuOpen"
          class="absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <button
            type="button"
            @click="
              editor.chain().focus().setParagraph().run();
              headingMenuOpen = false;
            "
            :class="{ 'is-active': editor.isActive('paragraph') }"
            class="tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <span class="font-normal">Paragraph</span>
          </button>
          <button
            type="button"
            @click="
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              headingMenuOpen = false;
            "
            :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
            class="tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Heading 1 (H1)
          </button>
          <button
            type="button"
            @click="
              editor.chain().focus().toggleHeading({ level: 3 }).run();
              headingMenuOpen = false;
            "
            :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
            class="tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Heading 2 (H2)
          </button>
          <button
            type="button"
            @click="
              editor.chain().focus().toggleHeading({ level: 4 }).run();
              headingMenuOpen = false;
            "
            :class="{ 'is-active': editor.isActive('heading', { level: 4 }) }"
            class="tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Heading 3 (H3)
          </button>
        </div>
      </div>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- List & Block Group -->
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="Bullet List"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="Ordered List"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 1.426m1.087-1.426L2.977 15.42m1.225-3.348H2.153"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        title="Blockquote"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleTaskList().run()"
        :class="{ 'is-active': editor.isActive('taskList') }"
        title="Task List"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        title="Code Block"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().setHorizontalRule().run()"
        title="Horizontal Rule"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 12h16.5"
          />
        </svg>
      </button>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- Align Group -->
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        @click="editor.chain().focus().setTextAlign('left').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
        title="Align Left"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().setTextAlign('center').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
        title="Align Center"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M6.75 12h10.5M3.75 17.25h16.5"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().setTextAlign('right').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
        title="Align Right"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5M7.5 12h13.5M3.75 17.25h16.5"
          />
        </svg>
      </button>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- Insert Group -->
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        @click="setLink"
        :class="{ 'is-active': editor.isActive('link') }"
        title="Insert Link"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="addImage"
        title="Insert Image"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </button>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- Table Group -->
    <div class="flex items-center gap-0.5">
      <div class="relative">
        <button
          type="button"
          @click="tableMenuOpen = !tableMenuOpen"
          :class="{ 'is-active': editor.isActive('table') }"
          title="Insert Table"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.375 19.5h17.25m-17.25-3.75h17.25m-17.25-3.75h17.25m-17.25-3.75h17.25M4.5 3.75v15.75"
            />
          </svg>
        </button>
        <div
          v-if="tableMenuOpen"
          class="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Insert Table
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button
              type="button"
              v-for="size in [
                { rows: 2, cols: 2 },
                { rows: 3, cols: 3 },
                { rows: 4, cols: 4 },
                { rows: 2, cols: 3 },
                { rows: 3, cols: 4 },
                { rows: 4, cols: 5 },
              ]"
              :key="`${size.rows}x${size.cols}`"
              @click="insertTable(size.rows, size.cols)"
              class="rounded-md bg-gray-100 px-2 py-1 text-xs hover:bg-blue-500 hover:text-white dark:bg-gray-700 dark:hover:bg-blue-600"
            >
              {{ size.rows }}x{{ size.cols }}
            </button>
          </div>
        </div>
      </div>

      <template v-if="editor.isActive('table')">
        <button
          type="button"
          @click="deleteTable"
          title="Delete Table"
          class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>

        <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

        <button
          type="button"
          @click="addRowBefore"
          title="Add Row Above"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="addRowAfter"
          title="Add Row Below"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="deleteRow"
          title="Delete Row"
          class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

        <button
          type="button"
          @click="addColumnBefore"
          title="Add Column Left"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10 19.5 3 12m0 0 7-7.5M3 12h18"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="addColumnAfter"
          title="Add Column Right"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="deleteColumn"
          title="Delete Column"
          class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

        <button
          type="button"
          @click="mergeCells"
          title="Merge Cells"
          :class="{
            'cursor-not-allowed opacity-50': !editor.can().mergeCells(),
          }"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 7.5h15M3 12h15m-7.5 4.5H21M3 16.5h.008v.008H3v-.008Z"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="splitCell"
          title="Split Cell"
          :class="{
            'cursor-not-allowed opacity-50': !editor.can().splitCell(),
          }"
          class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4h16v16H4V4zm4 0v16m8-16v16m-4-8h8m-8-4h8m-8 8h8"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="toggleHeaderRow"
          title="Toggle Header Row"
          class="tiptap-btn rounded-md px-1.5 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          TH
        </button>
      </template>
    </div>

    <div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

    <!-- Undo/Redo & Clear -->
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        @click="editor.chain().focus().undo().run()"
        title="Undo (Ctrl+Z)"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().redo().run()"
        title="Redo (Ctrl+Shift+Z)"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().clearNodes().unsetAllMarks().run()"
        title="Clear Formatting"
        class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tiptap-btn.is-active {
  @apply bg-blue-500 text-white;
}

.tiptap-btn.is-active:hover {
  @apply bg-blue-600 text-white;
}
</style>
