<script setup lang="ts">
import request, { type ApiResponse } from "@/request";
import type { AxiosProgressEvent } from "axios";
import { Extension } from "@tiptap/core";
import NodeRange from "@tiptap/extension-node-range";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { useLocalStorage } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import TiptapToolbar from "./TiptapToolbar.vue";

// Tiptap 扩展
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
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
import imageCompression from "browser-image-compression";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

const lowlight = createLowlight();
lowlight.register("html", html);
lowlight.register("css", css);
lowlight.register("js", js);
lowlight.register("ts", ts);
lowlight.register("python", python);

// 代码块 Tab 缩进扩展
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

// Markdown 快捷输入扩展
const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",
  addInputRules() {
    return [
      // 标题快捷输入
      {
        find: /^#\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.setBlockType(range.from, range.from, state.schema.nodes.heading, {
            level: 1,
          });
          state.apply(tr);
        },
        undoable: true,
      },
      {
        find: /^##\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.setBlockType(range.from, range.from, state.schema.nodes.heading, {
            level: 2,
          });
          state.apply(tr);
        },
        undoable: true,
      },
      {
        find: /^###\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          tr.setBlockType(range.from, range.from, state.schema.nodes.heading, {
            level: 3,
          });
          state.apply(tr);
        },
        undoable: true,
      },
      // 无序列表
      {
        find: /^[-*]\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.toggleBulletList();
        },
        undoable: true,
      },
      // 有序列表
      {
        find: /^1\.\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.toggleOrderedList();
        },
        undoable: true,
      },
      // 任务列表
      {
        find: /^\[\]\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.toggleTaskList();
        },
        undoable: true,
      },
      // 引用
      {
        find: /^>\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.toggleBlockquote();
        },
        undoable: true,
      },
      // 代码块
      {
        find: /^```\s$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.toggleCodeBlock();
        },
        undoable: true,
      },
      // 水平线
      {
        find: /^---$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          tr.delete(range.from, range.to);
          state.apply(tr);
          this.editor.commands.setHorizontalRule();
        },
        undoable: true,
      },
    ];
  },
});

// 图片上传
const uploadImage = async (file: File): Promise<string> => {
  isUploadingImage.value = true;
  uploadProgress.value = 0;

  try {
    // 图片压缩配置
    const compressionOptions = {
      maxSizeMB: 1, // 最大 1MB
      maxWidthOrHeight: 1920, // 最大分辨率 1920px
      useWebWorker: true,
      onProgress: (progress: number) => {
        uploadProgress.value = Math.round(progress * 50); // 压缩占 50% 进度
      },
    };

    // 压缩图片
    const compressedFile = await imageCompression(file, compressionOptions);
    uploadProgress.value = 50;

    const formData = new FormData();
    formData.append("file", compressedFile);

    const res = await request.post<ApiResponse<{ url: string; filename: string }>>(
      "/blog/upload-image",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const total = progressEvent.total ?? 0;
          if (total > 0) {
            const uploadPercent = Math.round((progressEvent.loaded / total) * 50);
            uploadProgress.value = 50 + uploadPercent; // 上传占 50% 进度
          }
        },
      },
    );

    if (res.data.status !== "success" || !res.data.data?.url) {
      throw new Error(res.data.message || "Image upload failed.");
    }

    uploadProgress.value = 100;
    return res.data.data.url;
  } finally {
    // 延迟隐藏进度条，让用户看到完成状态
    setTimeout(() => {
      isUploadingImage.value = false;
      uploadProgress.value = 0;
    }, 500);
  }
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
  const safeKey = key.trim().replace(/[^\w\u4e00-\u9fa5-]/g, "_");
  return `tiptap-draft-${safeKey}`;
};

// 计算当前使用的 storage key
const currentStorageKey = computed(() => getSafeStorageKey(props.storageKey));

// 草稿功能
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
let previousStorageKey = currentStorageKey.value;
watch(currentStorageKey, (newKey) => {
  if (newKey !== previousStorageKey && !isSwitchingDraft) {
    previousStorageKey = newKey;
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
  return drafts.sort((a, b) => a.title.localeCompare(b.title));
};

// 切换到指定草稿
const switchToDraft = (draftKey: string, draftTitle: string) => {
  isSwitchingDraft = true;
  saveDraft();
  const targetStorage = useLocalStorage<string>(draftKey, "");
  if (editor.value && targetStorage.value) {
    editor.value.commands.setContent(targetStorage.value);
    emit("update:modelValue", targetStorage.value);
  }
  emit("update:storageKey", draftTitle === "未命名草稿" ? "" : draftTitle);
  previousStorageKey = draftKey;
  setTimeout(() => {
    isSwitchingDraft = false;
  }, 100);
};

// 删除指定草稿
const deleteDraft = (draftKey: string) => {
  localStorage.removeItem(draftKey);
};

// 图片上传状态
const isUploadingImage = ref(false);
const uploadProgress = ref(0);

// 源代码编辑模式
const sourceMode = ref(false);
const sourceContent = ref("");

// 获取当前内容（无论哪种模式）
const getCurrentContent = () => {
  if (sourceMode.value) {
    // 源代码模式，将 Markdown 转换为 HTML
    const rawHtml = md.render(sourceContent.value);
    return DOMPurify.sanitize(rawHtml);
  } else {
    // 富文本模式，返回 HTML 内容
    return editor.value?.getHTML() || "";
  }
};

// 切换源代码模式
const toggleSourceMode = () => {
  if (!sourceMode.value) {
    // 切换到源代码模式，获取当前 Markdown 内容
    sourceContent.value = markdownContent.value;
  } else {
    // 切换到富文本模式，更新编辑器内容
    if (editor.value) {
      // 使用 setContent 直接设置内容，Tiptap 会自动处理
      editor.value.commands.setContent(sourceContent.value);
      // 更新 modelValue
      emit("update:modelValue", editor.value.getHTML());
    }
  }
  sourceMode.value = !sourceMode.value;
};

// 处理源代码内容变化
const handleSourceChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  sourceContent.value = target.value;
  // 同时更新 modelValue
  emit("update:modelValue", target.value);
};

// 编辑器内容的 Markdown 格式
const markdownContent = computed(() => {
  if (!editor.value) return "";
  // 明确类型接口并做类型断言（推荐）
  type MarkdownStorage = { getMarkdown?: () => string };
  const storage = (editor.value.storage as { markdown?: MarkdownStorage }).markdown;
  if (storage?.getMarkdown) {
    return storage.getMarkdown();
  }
  // 回退到 HTML
  return editor.value.getHTML();
});

// 暴露给父组件的方法
defineExpose({
  clearDraft,
  hasDraft,
  restoreDraft,
  saveDraft,
  getAllDrafts,
  switchToDraft,
  deleteDraft,
  toggleSourceMode,
  sourceMode,
  getCurrentContent,
});

// 编辑器实例
const editor = useEditor({
  content: props.modelValue || draftContent.value,
  extensions: [
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
    MarkdownShortcuts,

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

    Placeholder.configure({
      placeholder: "Write your post content here...",
    }),

    Underline,

    TextAlign.configure({ types: ["heading", "paragraph"] }),

    TaskList,
    TaskItem.configure({
      nested: true,
    }),

    NodeRange,

    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: "-",
    }),

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
  <div class="tiptap-editor-container flex">
    <!-- 主编辑区域 -->
    <div
      :class="[
        'tiptap-wrapper squircle relative flex flex-1 flex-col overflow-hidden border border-gray-200/60 bg-white/90 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900/90',
      ]"
    >
      <TiptapToolbar v-if="editor" :editor="editor" />

      <!-- 工具栏下方的快捷操作栏 -->
      <div
        class="relative flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4 py-1.5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50"
      >
        <!-- 上传进度条 -->
        <div
          v-if="isUploadingImage"
          class="absolute top-0 left-0 h-1 w-full bg-gray-200 dark:bg-gray-700"
        >
          <div
            class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Markdown 快捷键提示 -->
          <div class="hidden items-center gap-1 text-xs text-gray-400 md:flex dark:text-gray-500">
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800"> # </span>
            <span>标题</span>
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800"> - </span>
            <span>列表</span>
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800"> > </span>
            <span>引用</span>
            <span class="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800"> \`\`\` </span>
            <span>代码</span>
          </div>
        </div>

        <!-- 字符计数 -->
        <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{{ characterCount.characters }} chars</span>
          <span>{{ characterCount.words }} words</span>
        </div>

        <!-- 模式切换 -->
        <div class="flex items-center gap-2">
          <!-- 源代码模式切换 -->
          <button
            type="button"
            @click="toggleSourceMode"
            :class="[
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300',
              sourceMode
                ? 'bg-purple-100 text-purple-700 shadow-sm dark:bg-purple-900/30 dark:text-purple-300'
                : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300',
            ]"
            title="Toggle Source Mode"
          >
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
              />
            </svg>
            {{ sourceMode ? "富文本" : "源代码" }}
          </button>
        </div>
      </div>

      <!-- 编辑器内容 -->
      <div class="relative flex-1 overflow-auto">
        <!-- 源代码编辑模式 -->
        <div v-if="sourceMode" class="h-full">
          <textarea
            :value="sourceContent"
            @input="handleSourceChange"
            class="h-full w-full resize-none border-0 bg-transparent p-6 font-mono text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white"
            placeholder="在此输入 Markdown 源代码..."
            spellcheck="false"
          ></textarea>
        </div>
        <!-- 富文本编辑模式 -->
        <EditorContent v-else :editor="editor" />
      </div>

      <!-- 气泡菜单 -->
      <BubbleMenu
        v-if="editor && !sourceMode"
        :editor="editor"
        :should-show="
          ({ editor }) => {
            const { empty, from, to } = editor.state.selection;
            return !empty && to - from > 0;
          }
        "
        class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95"
      >
        <button
          type="button"
          @mousedown.stop
          @click="editor.chain().focus().toggleBold().run()"
          :class="[
            editor.isActive('bold')
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            'rounded-md p-1.5 transition-all duration-200 hover:scale-105',
          ]"
          title="Bold"
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
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            'rounded-md p-1.5 transition-all duration-200 hover:scale-105',
          ]"
          title="Italic"
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
        <div class="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          type="button"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="[
            editor.isActive('codeBlock')
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            'rounded-md p-1.5 transition-all duration-200 hover:scale-105',
          ]"
          title="Code Block"
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
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            'rounded-md p-1.5 transition-all duration-200 hover:scale-105',
          ]"
          title="Insert Link"
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
    </div>
  </div>
</template>

<style lang="scss">
.tiptap {
  :first-child {
    margin-top: 0;
  }

  p {
    @apply leading-relaxed;
  }

  img {
    display: block;
    border-radius: 0.75rem;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  img:hover {
    transform: scale(1.02);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  [data-resize-handle] {
    position: absolute;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    z-index: 10;

    &:hover {
      background: rgba(0, 0, 0, 0.8);
    }

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

  /* 代码块样式 */
  pre {
    @apply rounded-2xl bg-gray-100 p-4 text-sm dark:bg-gray-800;
  }

  /* 引用样式 */
  blockquote {
    @apply rounded-r-xl border-l-4 border-blue-500 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900/20;
  }
}

/* 自定义拖拽手柄 */
.custom-drag-handle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  border-radius: 6px;
  background: rgb(229 231 235 / 0.8);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.custom-drag-handle:hover {
  background: rgb(209 213 219);
  transform: scale(1.1);
}

.dark .custom-drag-handle {
  background: rgb(75 85 99 / 0.8);
}

.dark .custom-drag-handle:hover {
  background: rgb(107 114 128);
}

.custom-drag-handle::before {
  content: "⋮⋮";
  font-size: 12px;
  color: rgb(107 114 128);
  letter-spacing: 1px;
}

.dark .custom-drag-handle::before {
  color: rgb(209 213 219);
}

/* 编辑器容器 */
.tiptap-editor-container {
  min-height: 800px;
}

/* 同步滚动平滑效果 */
.tiptap-editor-container * {
  scroll-behavior: smooth;
}

/* 编辑器内容块样式增强 */
.tiptap :deep(h1),
.tiptap :deep(h2),
.tiptap :deep(h3),
.tiptap :deep(h4) {
  position: relative;
  font-weight: 700;
  scroll-margin-top: 2rem;
}

.tiptap :deep(h1)::before,
.tiptap :deep(h2)::before,
.tiptap :deep(h3)::before,
.tiptap :deep(h4)::before {
  content: "";
  position: absolute;
  left: -1.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(to bottom, rgb(59, 130, 246), rgb(147, 51, 234));
  opacity: 0;
  transition: all 0.2s ease;
}

.tiptap :deep(h1:hover::before),
.tiptap :deep(h2:hover::before),
.tiptap :deep(h3:hover::before),
.tiptap :deep(h4:hover::before) {
  opacity: 1;
  height: 70%;
}

.tiptap :deep(h1) {
  font-size: 2rem;
  line-height: 2.5rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.tiptap :deep(h2) {
  font-size: 1.5rem;
  line-height: 2rem;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
}

.tiptap :deep(h3) {
  font-size: 1.25rem;
  line-height: 1.75rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.tiptap :deep(h4) {
  font-size: 1.125rem;
  line-height: 1.5rem;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

/* 列表样式 */
.tiptap :deep(ul),
.tiptap :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.tiptap :deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

/* 表格样式 */
.tiptap :deep(table) {
  @apply w-full border-collapse overflow-hidden rounded-xl shadow-sm;
}

.tiptap :deep(th),
.tiptap :deep(td) {
  @apply border border-gray-200 px-4 py-2 dark:border-gray-700;
}

.tiptap :deep(th) {
  @apply bg-gray-100 font-semibold dark:bg-gray-800;
}

.tiptap :deep(tr:nth-child(even)) {
  @apply bg-gray-50 dark:bg-gray-900;
}
</style>
