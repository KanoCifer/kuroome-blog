<script setup lang="ts">
import type { Editor } from "@tiptap/core";
import { computed, ref } from "vue";

interface Props {
  editor: Editor;
}

const props = defineProps<Props>();

// 菜单状态
const tableMenuOpen = ref(false);
const headingMenuOpen = ref(false);
const toolbarCollapsed = ref(false);

// 计算当前选中的标题类型
const currentHeading = computed(() => {
  if (props.editor.isActive("heading", { level: 1 })) return "H2";
  if (props.editor.isActive("heading", { level: 2 })) return "H3";
  if (props.editor.isActive("heading", { level: 3 })) return "H4";
  if (props.editor.isActive("heading", { level: 4 })) return "H5";
  return "P";
});

// 表格操作
const insertTable = (rows: number, cols: number) => {
  props.editor
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: true })
    .run();
  tableMenuOpen.value = false;
};

// 快捷键提示
const shortcuts = {
  bold: "Ctrl+B",
  italic: "Ctrl+I",
  underline: "Ctrl+U",
  strike: "Ctrl+Shift+X",
  code: "Ctrl+E",
  link: "Ctrl+K",
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
};
</script>

<template>
  <div class="tiptap-toolbar">
    <!-- 工具栏主体 -->
    <div
      :class="[
        'flex flex-wrap items-center gap-0.5 border-b border-gray-200/60 bg-gray-50/80 px-2 py-1 backdrop-blur-sm transition-all duration-200 dark:border-gray-700/60 dark:bg-gray-900/80',
        toolbarCollapsed ? 'h-0 overflow-hidden border-b-0 py-0' : '',
      ]"
    >
      <!-- 第一组：文本格式 -->
      <div class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor.isActive('bold') }"
          :title="`Bold (${shortcuts.bold})`"
          class="toolbar-btn"
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
          :title="`Italic (${shortcuts.italic})`"
          class="toolbar-btn"
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
          :title="`Underline (${shortcuts.underline})`"
          class="toolbar-btn"
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
          class="toolbar-btn"
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
          :title="`Inline Code (${shortcuts.code})`"
          class="toolbar-btn"
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

      <div class="toolbar-divider"></div>

      <!-- 第二组：标题 -->
      <div class="toolbar-group">
        <div class="relative">
          <button
            type="button"
            @click="headingMenuOpen = !headingMenuOpen"
            class="toolbar-btn flex items-center gap-1 px-2 py-1 text-xs font-medium"
            title="Text Style"
          >
            <span
              :class="[
                currentHeading !== 'P' ? 'font-bold' : '',
                'min-w-[20px] text-center',
              ]"
            >
              {{ currentHeading }}
            </span>
            <svg
              class="h-3 w-3 transition-transform"
              :class="{ 'rotate-180': headingMenuOpen }"
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
          <div v-if="headingMenuOpen" class="toolbar-dropdown">
            <button
              type="button"
              @click="
                editor.chain().focus().setParagraph().run();
                headingMenuOpen = false;
              "
              :class="{ 'is-active': editor.isActive('paragraph') }"
              class="dropdown-item"
            >
              <span class="text-sm">Paragraph</span>
            </button>
            <button
              type="button"
              v-for="level in [1, 2, 3, 4]"
              :key="level"
              @click="
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as any })
                  .run();
                headingMenuOpen = false;
              "
              :class="{
                'is-active': editor.isActive('heading', {
                  level: level as any,
                }),
              }"
              class="dropdown-item"
            >
              <span
                :class="[
                  'font-bold',
                  level === 1
                    ? 'text-lg'
                    : level === 2
                      ? 'text-base'
                      : level === 3
                        ? 'text-sm'
                        : 'text-xs',
                ]"
              >
                Heading {{ level }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-divider"></div>

      <!-- 第三组：列表和块 -->
      <div class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          title="Bullet List"
          class="toolbar-btn"
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
          class="toolbar-btn"
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
          @click="editor.chain().focus().toggleTaskList().run()"
          :class="{ 'is-active': editor.isActive('taskList') }"
          title="Task List"
          class="toolbar-btn"
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
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          title="Blockquote"
          class="toolbar-btn"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"
            />
          </svg>
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          title="Code Block"
          class="toolbar-btn"
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
          class="toolbar-btn"
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

      <div class="toolbar-divider"></div>

      <!-- 第四组：对齐 -->
      <div class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().setTextAlign('left').run()"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          title="Align Left"
          class="toolbar-btn"
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
          class="toolbar-btn"
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
          class="toolbar-btn"
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

      <div class="toolbar-divider"></div>

      <!-- 第五组：插入 -->
      <div class="toolbar-group">
        <!-- 表格菜单 -->
        <div class="relative">
          <button
            type="button"
            @click="tableMenuOpen = !tableMenuOpen"
            :class="{ 'is-active': editor.isActive('table') }"
            title="Insert Table"
            class="toolbar-btn"
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
          <div v-if="tableMenuOpen" class="toolbar-dropdown w-48">
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
                {{ size.rows }}×{{ size.cols }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar-divider"></div>

      <!-- 第六组：表格操作（仅在表格中显示） -->
      <div v-if="editor.isActive('table')" class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().addRowBefore().run()"
          title="Add Row Above"
          class="toolbar-btn"
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
          @click="editor.chain().focus().addRowAfter().run()"
          title="Add Row Below"
          class="toolbar-btn"
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
          @click="editor.chain().focus().addColumnBefore().run()"
          title="Add Column Left"
          class="toolbar-btn"
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
          @click="editor.chain().focus().addColumnAfter().run()"
          title="Add Column Right"
          class="toolbar-btn"
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
          @click="editor.chain().focus().deleteRow().run()"
          title="Delete Row"
          class="toolbar-btn text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
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
        <button
          type="button"
          @click="editor.chain().focus().deleteColumn().run()"
          title="Delete Column"
          class="toolbar-btn text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
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
        <button
          type="button"
          @click="editor.chain().focus().mergeCells().run()"
          title="Merge Cells"
          :class="{
            'cursor-not-allowed opacity-50': !editor.can().mergeCells(),
          }"
          class="toolbar-btn"
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
          @click="editor.chain().focus().splitCell().run()"
          title="Split Cell"
          :class="{
            'cursor-not-allowed opacity-50': !editor.can().splitCell(),
          }"
          class="toolbar-btn"
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
          @click="editor.chain().focus().toggleHeaderRow().run()"
          title="Toggle Header Row"
          class="toolbar-btn px-1.5 text-xs font-bold"
        >
          TH
        </button>
        <button
          type="button"
          @click="editor.chain().focus().deleteTable().run()"
          title="Delete Table"
          class="toolbar-btn text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
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

      <div v-if="editor.isActive('table')" class="toolbar-divider"></div>

      <!-- 第七组：撤销/重做/清除 -->
      <div class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().undo().run()"
          :title="`Undo (${shortcuts.undo})`"
          class="toolbar-btn"
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
          :title="`Redo (${shortcuts.redo})`"
          class="toolbar-btn"
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
          class="toolbar-btn"
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

      <!-- 折叠按钮 -->
      <div class="ml-auto">
        <button
          type="button"
          @click="toolbarCollapsed = !toolbarCollapsed"
          class="toolbar-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          :title="toolbarCollapsed ? '展开工具栏' : '折叠工具栏'"
        >
          <svg
            class="h-4 w-4 transition-transform"
            :class="{ 'rotate-180': toolbarCollapsed }"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.5 15.75l7.5-7.5 7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/base.css";

/* 工具栏按钮 */
.toolbar-btn {
  @apply rounded-full p-1.5 text-gray-500 transition-all duration-200 hover:scale-105 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white;
}

.toolbar-btn.is-active {
  @apply bg-blue-500 text-white shadow-sm hover:bg-blue-600;
}

/* 工具栏分组 */
.toolbar-group {
  @apply flex items-center gap-0.5;
}

/* 工具栏分隔线 */
.toolbar-divider {
  @apply mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600;
}

/* 下拉菜单 */
.toolbar-dropdown {
  @apply absolute top-full left-0 z-50 mt-1 rounded-2xl border border-gray-200/60 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/95;
}

/* 下拉菜单项 */
.dropdown-item {
  @apply w-full rounded-full px-3 py-1.5 text-left text-xs text-gray-500 transition-all duration-200 hover:translate-x-1 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white;
}

.dropdown-item.is-active {
  @apply bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300;
}
</style>
