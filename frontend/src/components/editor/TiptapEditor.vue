<script setup lang="ts">
import request, { type ApiResponse } from "@/request";
import { Extension } from "@tiptap/core";
import { DragHandle } from "@tiptap/extension-drag-handle-vue-3";
import NodeRange from "@tiptap/extension-node-range";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { useLocalStorage } from "@vueuse/core";
import { computed, onBeforeUnmount, watch } from "vue";
import TiptapToolbar from "./TiptapToolbar.vue";

// Tiptap 扩展（按需引入，减小体积）
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { CharacterCount, Dropcursor } from "@tiptap/extensions";
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";
import { createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";

const lowlight = createLowlight();
lowlight.register("html", html);
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("ts", ts);
lowlight.register("python", python);

const CodeBlockTabIndent = Extension.create({
  name: "codeBlockTabIndent",
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive("codeBlock")) return false;
        this.editor.commands.insertContent("\t");
        return true;
      },
    };
  },
});

const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await request.post<
    ApiResponse<{ url: string; filename: string }>
  >("/blog/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (res.data.status !== "success" || !res.data.data?.url) {
    throw new Error(res.data.message || "Image upload failed.");
  }

  return res.data.data.url;
};

// v-model 双向绑定
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:storageKey": [value: string];
}>();

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  storageKey: {
    type: String,
    default: "",
  },
});

// 生成安全的 storage key
const getSafeStorageKey = (key: string): string => {
  if (!key || key.trim() === "") {
    return "tiptap-draft-default";
  }
  // 移除特殊字符，只保留字母、数字、中文和常用符号
  const safeKey = key.trim().replace(/[^\w\u4e00-\u9fa5-]/g, "_");
  return `tiptap-draft-${safeKey}`;
};

// 计算当前使用的 storage key
const currentStorageKey = computed(() => getSafeStorageKey(props.storageKey));

// 草稿功能 (手动保存) - 使用响应式的 key
const draftContent = computed({
  get: () => {
    const storage = useLocalStorage<string>(currentStorageKey.value, "");
    return storage.value;
  },
  set: (value: string) => {
    const storage = useLocalStorage<string>(currentStorageKey.value, "");
    storage.value = value;
  },
});

// 手动保存草稿
const saveDraft = (): void => {
  if (editor.value) {
    const content = editor.value.getHTML();
    draftContent.value = content;
  }
};

// 清除草稿
const clearDraft = (): void => {
  draftContent.value = "";
};

// 检查是否有草稿
const hasDraft = computed(() => {
  return draftContent.value && draftContent.value.trim().length > 0;
});

// 恢复草稿
const restoreDraft = (): void => {
  if (hasDraft.value && editor.value) {
    editor.value.commands.setContent(draftContent.value);
    emit("update:modelValue", draftContent.value);
  }
};
// 标记是否是切换草稿操作
let isSwitchingDraft = false;
// 监听 storageKey 变化，动态切换草稿
let previousStorageKey = currentStorageKey.value;
watch(currentStorageKey, (newKey) => {
  if (newKey !== previousStorageKey && !isSwitchingDraft) {
    // 只切换草稿，不自动保存（避免输入过程中创建多个草稿）
    previousStorageKey = newKey;
    // 如果新 key 有草稿，自动加载
    if (hasDraft.value && editor.value && !props.modelValue) {
      editor.value.commands.setContent(draftContent.value);
      emit("update:modelValue", draftContent.value);
    }
  }
});

// 获取所有草稿列表
const getAllDrafts = (): Array<{
  key: string;
  title: string;
  hasContent: boolean;
}> => {
  const drafts: Array<{ key: string; title: string; hasContent: boolean }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("tiptap-draft-")) {
      const content = localStorage.getItem(key) || "";
      let title = key.replace("tiptap-draft-", "");
      // 还原下划线为空格（简单处理）
      title = title.replace(/_/g, " ");
      if (title === "default") {
        title = "未命名草稿";
      }
      drafts.push({
        key,
        title,
        hasContent: content.trim().length > 0,
      });
    }
  }
  // 按标题排序
  return drafts.sort((a, b) => a.title.localeCompare(b.title));
};

// 切换到指定草稿
const switchToDraft = (draftKey: string, draftTitle: string) => {
  isSwitchingDraft = true;
  // 先保存当前草稿
  saveDraft();
  // 加载目标草稿
  const targetStorage = useLocalStorage<string>(draftKey, "");
  if (editor.value && targetStorage.value) {
    editor.value.commands.setContent(targetStorage.value);
    emit("update:modelValue", targetStorage.value);
  }
  // 通知父组件更新标题
  emit("update:storageKey", draftTitle === "未命名草稿" ? "" : draftTitle);
  // 更新 previousStorageKey
  previousStorageKey = draftKey;
  // 延迟重置标志，确保 watch 不会触发
  setTimeout(() => {
    isSwitchingDraft = false;
  }, 100);
};

// 删除指定草稿
const deleteDraft = (draftKey: string) => {
  localStorage.removeItem(draftKey);
};

// 暴露给父组件的方法
defineExpose({
  clearDraft,
  hasDraft,
  restoreDraft,
  saveDraft,
  getAllDrafts,
  switchToDraft,
  deleteDraft,
});

// 编辑器实例
const editor = useEditor({
  content: props.modelValue || draftContent.value,
  extensions: [
    // 基础扩展
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      codeBlock: false,
      link: false,
      underline: false,
    }),

    CodeBlockLowlight.configure({
      lowlight,
      enableTabIndentation: true,
    }),
    CodeBlockTabIndent,

    // 链接与图片
    Link.configure({ openOnClick: false }),

    Image.configure({
      resize: {
        enabled: true,
        directions: ["top", "bottom", "left", "right"],
        minWidth: 50,
        minHeight: 50,
        alwaysPreserveAspectRatio: true,
      },
      allowBase64: true,
    }),
    Document,
    Paragraph,
    Text,
    Dropcursor,

    // 占位符
    Placeholder.configure({
      placeholder: "Write your post content here...",
    }),

    // 下划线
    Underline,

    // 对齐
    TextAlign.configure({ types: ["heading", "paragraph"] }),

    // 任务列表
    TaskList,
    TaskItem.configure({
      nested: true,
    }),

    // 拖拽功能
    NodeRange,
    // Markdown 支持
    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: "-",
    }),

    // 表格
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,

    FileHandler.configure({
      allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
      onDrop: async (currentEditor, files, pos) => {
        for (const file of files) {
          try {
            const url = await uploadImage(file);
            currentEditor
              .chain()
              .insertContentAt(pos, {
                type: "image",
                attrs: { src: url },
              })
              .focus()
              .run();
          } catch (error) {
            console.error("图片上传失败:", error);
          }
        }
      },
      onPaste: async (currentEditor, files) => {
        for (const file of files) {
          try {
            const url = await uploadImage(file);
            currentEditor
              .chain()
              .insertContentAt(currentEditor.state.selection.anchor, {
                type: "image",
                attrs: { src: url },
              })
              .focus()
              .run();
          } catch (error) {
            console.error("图片上传失败:", error);
          }
        }
      },
    }),
  ],

  editorProps: {
    attributes: {
      class:
        "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[800px] px-6 py-4",
    },
    handleDOMEvents: {
      keydown: (view, event) => {
        if (event.key !== "Tab") return false;
        const { state } = view;
        const { $from } = state.selection;
        if ($from.parent.type.name !== "codeBlock") return false;
        event.preventDefault();
        const tr = state.tr.insertText("\t");
        view.dispatch(tr);
        return true;
      },
    },
  },

  onUpdate: ({ editor }) => {
    const content = editor.getHTML();
    emit("update:modelValue", content);
  },
});

// 监听 props.modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    // 只有当外部传入的值与编辑器当前内容不同时才更新
    // 这样可以避免父组件更新时重置编辑器状态
    const currentContent = editor.value?.getHTML() || "";
    if (newValue && editor.value && newValue !== currentContent) {
      editor.value.commands.setContent(newValue);
    }
  },
);

// 切换链接
const toggleLink = () => {
  if (editor.value) {
    const url = prompt("请输入链接地址");
    if (url) {
      editor.value.chain().focus().toggleLink({ href: url }).run();
    }
  }
};

// 字符计数计算属性
const characterCount = computed(() => {
  if (!editor.value) return { characters: 0, words: 0 };
  const text = editor.value.getText().trim();
  const characters = text.length;
  const words = text.split(/\s+/).filter((word) => word.length > 0).length;
  return { characters, words };
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<template>
  <div
    class="tiptap-wrapper relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <TiptapToolbar v-if="editor" :editor="editor" />
    <drag-handle v-if="editor" :editor="editor">
      <div class="drag-handle custom-drag-handle"></div>
    </drag-handle>
    <EditorContent :editor="editor" />

    <!-- 气泡菜单 -->
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :should-show="
        ({ editor }) => {
          const { empty, from, to } = editor.state.selection;
          return !empty && to - from > 0;
        }
      "
      class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
    >
      <button
        type="button"
        @mousedown.stop
        @click="editor.chain().focus().toggleBold().run()"
        :class="[
          editor.isActive('bold')
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:text-gray-900',
          'rounded-md p-1.5 transition-colors',
        ]"
        title="加粗"
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
        @mousedown.stop
        @click="editor.chain().focus().toggleItalic().run()"
        :class="[
          editor.isActive('italic')
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:text-gray-900',
          'rounded-md p-1.5 transition-colors',
        ]"
        title="斜体"
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
      <div class="mx-1 h-4 w-px bg-gray-300"></div>
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
        @mousedown.stop
        @click="toggleLink"
        :class="[
          editor.isActive('link')
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-600 hover:text-gray-900',
          'rounded-md p-1.5 transition-colors',
        ]"
        title="插入链接"
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
    </BubbleMenu>

    <!-- 字符计数 -->
    <div
      v-if="editor"
      class="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-6 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
    >
      <span>Characters: {{ characterCount.characters }}</span>
      <span>Words: {{ characterCount.words }}</span>
    </div>
  </div>
</template>

<style lang="scss">
.tiptap {
  :first-child {
    margin-top: 0;
  }

  img {
    display: block;
  }

  [data-resize-handle] {
    position: absolute;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    z-index: 10;

    &:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    /* Corner handles */
    &[data-resize-handle="top-left"],
    &[data-resize-handle="top-right"],
    &[data-resize-handle="bottom-left"],
    &[data-resize-handle="bottom-right"] {
      width: 8px;
      height: 8px;
    }

    &[data-resize-handle="top-left"] {
      top: -4px;
      left: -4px;
      cursor: nwse-resize;
    }

    &[data-resize-handle="top-right"] {
      top: -4px;
      right: -4px;
      cursor: nesw-resize;
    }

    &[data-resize-handle="bottom-left"] {
      bottom: -4px;
      left: -4px;
      cursor: nesw-resize;
    }

    &[data-resize-handle="bottom-right"] {
      bottom: -4px;
      right: -4px;
      cursor: nwse-resize;
    }
  }
}
</style>
