import { defineComponent, ref, computed, mergeProps, useSSRContext, onBeforeUnmount, unref, withCtx, openBlock, createBlock, createVNode, withModifiers, onMounted } from "vue";
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrRenderComponent, ssrRenderAttr, ssrIncludeBooleanAttr } from "vue/server-renderer";
import DragHandleExtension from "@tiptap/extension-drag-handle";
import { DragHandle } from "@tiptap/extension-drag-handle-vue-3";
import NodeRange from "@tiptap/extension-node-range";
import StarterKit from "@tiptap/starter-kit";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import { _ as _export_sfc, u as useNotificationStore, r as request } from "../main.mjs";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableRow, TableHeader, TableCell, Table } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { CharacterCount } from "@tiptap/extensions";
import { createLowlight, common } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { useRoute, useRouter } from "vue-router";
import "@vueuse/head";
import "pinia";
import "axios";
import "dayjs";
import "dayjs/plugin/utc.js";
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "TiptapToolbar",
  __ssrInlineRender: true,
  props: {
    editor: {}
  },
  setup(__props) {
    const props = __props;
    const tableMenuOpen = ref(false);
    const headingMenuOpen = ref(false);
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
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900" }, _attrs))} data-v-674f6015><div class="flex items-center gap-0.5" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("bold") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Bold (Ctrl+B)" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" data-v-674f6015></path><path stroke-linecap="round" stroke-linejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("italic") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Italic (Ctrl+I)" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M10 4h4m-2 0l-4 16m0 0h4M8 20h4" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("underline") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Underline (Ctrl+U)" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M7 4v7a5 5 0 0010 0V4M5 20h14" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("strike") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Strikethrough" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M16 4H9a3 3 0 000 6h2m4 0H9a3 3 0 000 6h7M4 12h16" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("code") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Inline Code" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" data-v-674f6015></path></svg></button></div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><div class="relative" data-v-674f6015><button type="button" class="tiptap-btn flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" title="Text Style" data-v-674f6015><span data-v-674f6015>${ssrInterpolate(currentHeading.value)}</span><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" data-v-674f6015></path></svg></button>`);
      if (headingMenuOpen.value) {
        _push(`<div class="absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("paragraph") }, "tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015><span class="font-normal" data-v-674f6015>Paragraph</span></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("heading", { level: 2 }) }, "tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015> Heading 1 (H1) </button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("heading", { level: 3 }) }, "tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015> Heading 2 (H2) </button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("heading", { level: 4 }) }, "tiptap-btn w-full rounded-md px-2 py-1.5 text-left text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015> Heading 3 (H3) </button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("bulletList") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Bullet List" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("orderedList") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Ordered List" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 1.426m1.087-1.426L2.977 15.42m1.225-3.348H2.153" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("blockquote") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Blockquote" data-v-674f6015><svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" data-v-674f6015><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("taskList") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Task List" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("codeBlock") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Code Block" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" data-v-674f6015></path></svg></button><button type="button" title="Horizontal Rule" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5" data-v-674f6015></path></svg></button></div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive({ textAlign: "left" }) }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Align Left" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive({ textAlign: "center" }) }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Align Center" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M6.75 12h10.5M3.75 17.25h16.5" data-v-674f6015></path></svg></button><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive({ textAlign: "right" }) }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Align Right" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M7.5 12h13.5M3.75 17.25h16.5" data-v-674f6015></path></svg></button></div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("link") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Insert Link" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" data-v-674f6015></path></svg></button><button type="button" title="Insert Image" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" data-v-674f6015></path></svg></button></div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><div class="relative" data-v-674f6015><button type="button" class="${ssrRenderClass([{ "is-active": __props.editor.isActive("table") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Insert Table" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25-3.75h17.25m-17.25-3.75h17.25m-17.25-3.75h17.25M4.5 3.75v15.75" data-v-674f6015></path></svg></button>`);
      if (tableMenuOpen.value) {
        _push(`<div class="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800" data-v-674f6015><div class="mb-2 text-xs text-gray-500 dark:text-gray-400" data-v-674f6015> Insert Table </div><div class="grid grid-cols-3 gap-1" data-v-674f6015><!--[-->`);
        ssrRenderList([
          { rows: 2, cols: 2 },
          { rows: 3, cols: 3 },
          { rows: 4, cols: 4 },
          { rows: 2, cols: 3 },
          { rows: 3, cols: 4 },
          { rows: 4, cols: 5 }
        ], (size) => {
          _push(`<button type="button" class="rounded-md bg-gray-100 px-2 py-1 text-xs hover:bg-blue-500 hover:text-white dark:bg-gray-700 dark:hover:bg-blue-600" data-v-674f6015>${ssrInterpolate(size.rows)}x${ssrInterpolate(size.cols)}</button>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (__props.editor.isActive("table")) {
        _push(`<!--[--><button type="button" title="Delete Table" class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" data-v-674f6015></path></svg></button><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><button type="button" title="Add Row Above" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" data-v-674f6015></path></svg></button><button type="button" title="Add Row Below" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" data-v-674f6015></path></svg></button><button type="button" title="Delete Row" class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" data-v-674f6015></path></svg></button><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><button type="button" title="Add Column Left" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M10 19.5 3 12m0 0 7-7.5M3 12h18" data-v-674f6015></path></svg></button><button type="button" title="Add Column Right" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" data-v-674f6015></path></svg></button><button type="button" title="Delete Column" class="tiptap-btn rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" data-v-674f6015></path></svg></button><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><button type="button" title="Merge Cells" class="${ssrRenderClass([{
          "cursor-not-allowed opacity-50": !__props.editor.can().mergeCells()
        }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5h15M3 12h15m-7.5 4.5H21M3 16.5h.008v.008H3v-.008Z" data-v-674f6015></path></svg></button><button type="button" title="Split Cell" class="${ssrRenderClass([{
          "cursor-not-allowed opacity-50": !__props.editor.can().splitCell()
        }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4V4zm4 0v16m8-16v16m-4-8h8m-8-4h8m-8 8h8" data-v-674f6015></path></svg></button><button type="button" title="Toggle Header Row" class="tiptap-btn rounded-md px-1.5 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015> TH </button><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" data-v-674f6015></div><div class="flex items-center gap-0.5" data-v-674f6015><button type="button" title="Undo (Ctrl+Z)" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" data-v-674f6015></path></svg></button><button type="button" title="Redo (Ctrl+Shift+Z)" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" data-v-674f6015></path></svg></button><button type="button" title="Clear Formatting" class="tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white" data-v-674f6015><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" data-v-674f6015><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" data-v-674f6015></path></svg></button></div></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/TiptapToolbar.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const TiptapToolbar = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-674f6015"]]);
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "TiptapEditor",
  __ssrInlineRender: true,
  props: {
    modelValue: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const lowlight = createLowlight(common);
    const emit = __emit;
    const props = __props;
    const editor = useEditor({
      content: props.modelValue,
      extensions: [
        // 基础扩展
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          codeBlock: false,
          // 使用 CodeBlockLowlight 替代
          link: false,
          // 使用独立扩展
          underline: false
        }),
        // 代码高亮
        CodeBlockLowlight.configure({ lowlight }),
        // 链接与图片
        Link.configure({ openOnClick: false }),
        Image,
        // 占位符
        Placeholder.configure({
          placeholder: "Write your post content here..."
        }),
        // 下划线
        Underline,
        // 对齐
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        // 任务列表
        TaskList,
        TaskItem.configure({
          nested: true
        }),
        // 拖拽功能
        NodeRange,
        DragHandleExtension,
        // Markdown 支持
        Markdown.configure({
          html: true,
          tightLists: true,
          bulletListMarker: "-"
        }),
        // 表格
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CharacterCount
      ],
      editorProps: {
        attributes: {
          class: "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4"
        }
      },
      onUpdate: ({ editor: editor2 }) => {
        emit("update:modelValue", editor2.getHTML());
      }
    });
    const toggleLink = () => {
      if (editor.value) {
        const url = prompt("请输入链接地址");
        if (url) {
          editor.value.chain().focus().toggleLink({ href: url }).run();
        }
      }
    };
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
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "tiptap-wrapper relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800" }, _attrs))}>`);
      if (unref(editor)) {
        _push(ssrRenderComponent(TiptapToolbar, { editor: unref(editor) }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      if (unref(editor)) {
        _push(ssrRenderComponent(unref(DragHandle), { editor: unref(editor) }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<svg class="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16"${_scopeId}></path></svg>`);
            } else {
              return [
                (openBlock(), createBlock("svg", {
                  class: "h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                  fill: "none",
                  viewBox: "0 0 24 24",
                  "stroke-width": "2",
                  stroke: "currentColor"
                }, [
                  createVNode("path", {
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                    d: "M4 8h16M4 16h16"
                  })
                ]))
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(unref(EditorContent), { editor: unref(editor) }, null, _parent));
      if (unref(editor)) {
        _push(ssrRenderComponent(unref(BubbleMenu), {
          editor: unref(editor),
          "should-show": ({ editor: editor2 }) => {
            const { empty, from, to } = editor2.state.selection;
            return !empty && to - from > 0;
          },
          class: "flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<button type="button" class="${ssrRenderClass([
                unref(editor).isActive("bold") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                "rounded-md p-1.5 transition-colors"
              ])}" title="加粗"${_scopeId}><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"${_scopeId}></path><path stroke-linecap="round" stroke-linejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"${_scopeId}></path></svg></button><button type="button" class="${ssrRenderClass([
                unref(editor).isActive("italic") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                "rounded-md p-1.5 transition-colors"
              ])}" title="斜体"${_scopeId}><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M10 4h4m-2 0l-4 16m0 0h4M8 20h4"${_scopeId}></path></svg></button><div class="mx-1 h-4 w-px bg-gray-300"${_scopeId}></div><button type="button" class="${ssrRenderClass([{ "is-active": unref(editor).isActive("codeBlock") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"])}" title="Code Block"${_scopeId}><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"${_scopeId}></path></svg></button><button type="button" class="${ssrRenderClass([
                unref(editor).isActive("link") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                "rounded-md p-1.5 transition-colors"
              ])}" title="插入链接"${_scopeId}><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"${_scopeId}><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"${_scopeId}></path></svg></button>`);
            } else {
              return [
                createVNode("button", {
                  type: "button",
                  onMousedown: withModifiers(() => {
                  }, ["stop"]),
                  onClick: ($event) => unref(editor).chain().focus().toggleBold().run(),
                  class: [
                    unref(editor).isActive("bold") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                    "rounded-md p-1.5 transition-colors"
                  ],
                  title: "加粗"
                }, [
                  (openBlock(), createBlock("svg", {
                    class: "h-4 w-4",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    "stroke-width": "2.5",
                    stroke: "currentColor"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      d: "M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
                    }),
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      d: "M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
                    })
                  ]))
                ], 42, ["onMousedown", "onClick"]),
                createVNode("button", {
                  type: "button",
                  onMousedown: withModifiers(() => {
                  }, ["stop"]),
                  onClick: ($event) => unref(editor).chain().focus().toggleItalic().run(),
                  class: [
                    unref(editor).isActive("italic") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                    "rounded-md p-1.5 transition-colors"
                  ],
                  title: "斜体"
                }, [
                  (openBlock(), createBlock("svg", {
                    class: "h-4 w-4",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    "stroke-width": "2",
                    stroke: "currentColor"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      d: "M10 4h4m-2 0l-4 16m0 0h4M8 20h4"
                    })
                  ]))
                ], 42, ["onMousedown", "onClick"]),
                createVNode("div", { class: "mx-1 h-4 w-px bg-gray-300" }),
                createVNode("button", {
                  type: "button",
                  onClick: ($event) => unref(editor).chain().focus().toggleCodeBlock().run(),
                  class: [{ "is-active": unref(editor).isActive("codeBlock") }, "tiptap-btn rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"],
                  title: "Code Block"
                }, [
                  (openBlock(), createBlock("svg", {
                    class: "h-4 w-4",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    "stroke-width": "2",
                    stroke: "currentColor"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      d: "M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12a2.25 2.25 0 001.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    })
                  ]))
                ], 10, ["onClick"]),
                createVNode("button", {
                  type: "button",
                  onMousedown: withModifiers(() => {
                  }, ["stop"]),
                  onClick: toggleLink,
                  class: [
                    unref(editor).isActive("link") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:text-gray-900",
                    "rounded-md p-1.5 transition-colors"
                  ],
                  title: "插入链接"
                }, [
                  (openBlock(), createBlock("svg", {
                    class: "h-4 w-4",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    "stroke-width": "2",
                    stroke: "currentColor"
                  }, [
                    createVNode("path", {
                      "stroke-linecap": "round",
                      "stroke-linejoin": "round",
                      d: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    })
                  ]))
                ], 42, ["onMousedown"])
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      if (unref(editor)) {
        _push(`<div class="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-6 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"><span>Characters: ${ssrInterpolate(characterCount.value.characters)}</span><span>Words: ${ssrInterpolate(characterCount.value.words)}</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/components/TiptapEditor.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BlogEditView",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    useRouter();
    const notification = useNotificationStore();
    const isEdit = ref(false);
    const postId = ref(null);
    const title = ref("");
    const category = ref("");
    const body = ref("");
    const pin = ref(false);
    const categoryMenuOpen = ref(false);
    const currentCategory = computed(() => {
      if (!category.value) return "";
      const selectedCategory = categories.value.find(
        (cat) => String(cat.id) === category.value
      );
      return selectedCategory ? selectedCategory.name : "";
    });
    const categories = ref([]);
    const loading = ref(false);
    const error = ref("");
    onMounted(async () => {
      await fetchCategories();
      const id = route.params.id;
      if (id && id !== "new") {
        isEdit.value = true;
        postId.value = String(id);
        await fetchPost(postId.value);
      }
    });
    const fetchCategories = async () => {
      try {
        const res = await request.get("/categories");
        if (res.data.status === "success") {
          categories.value = res.data.data || [];
        }
      } catch (err) {
        console.error(err);
        notification.error("加载分类失败");
      }
    };
    const fetchPost = async (id) => {
      loading.value = true;
      try {
        const res = await request.get("/post", {
          params: { _id: id }
        });
        if (res.data.status === "success" && res.data.data) {
          const post = res.data.data;
          title.value = post.title || "";
          category.value = post.category_id ? String(post.category_id) : "";
          body.value = post.body || "";
          pin.value = Boolean(post.is_pinned);
        } else {
          throw new Error(res.data.message);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to load post";
        notification.error(error.value);
        console.error(err);
      } finally {
        loading.value = false;
      }
    };
    ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "container mx-auto px-4 py-8" }, _attrs))}><div class="mx-auto max-w-5xl rounded-[40px] bg-gray-50/80 px-10 py-6 shadow-md backdrop-blur-lg dark:bg-gray-900"><div class="mb-8"><h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">${ssrInterpolate(isEdit.value ? "Edit Post" : "New Post")}</h1>`);
      if (isEdit.value && postId.value) {
        _push(`<p class="mt-1 text-sm text-gray-500 dark:text-gray-400"> ID: ${ssrInterpolate(postId.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (error.value) {
        _push(`<div class="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200"><div class="flex items-center"><svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> ${ssrInterpolate(error.value)}</div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (loading.value && isEdit.value) {
        _push(`<div class="py-12 text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div><p class="mt-2 text-gray-600 dark:text-gray-400">Loading post...</p></div>`);
      } else {
        _push(`<form class="space-y-6"><div class="space-y-4"><div class="group relative rounded-3xl border border-gray-200 bg-white p-2 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"><label for="title" class="sr-only">Post Title</label><input id="title"${ssrRenderAttr("value", title.value)} type="text" required placeholder="Enter post title..." class="block w-full border-0 bg-transparent px-4 py-3 text-xl font-bold text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-2xl dark:text-white"></div><div class="flex items-center gap-4"><button type="button" class="${ssrRenderClass([
          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none",
          pin.value ? "border-amber-500 bg-amber-50 text-amber-700 ring-amber-500 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30" : "border-gray-300 bg-white text-gray-600 ring-blue-500 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-gray-700"
        ])}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="${ssrRenderClass([
          "h-4 w-4 transition-transform duration-200",
          pin.value ? "rotate-0" : "rotate-45"
        ])}"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"></path><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"></path></svg> ${ssrInterpolate(pin.value ? "已置顶" : "置顶")}</button><div class="group relative flex w-auto items-center"><button type="button" class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white"><div class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="mr-2 h-4 w-4 shrink-0 text-gray-400 transition-colors group-focus-within:text-blue-500 dark:text-gray-500"><path fill-rule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM2.5 11A1.5 1.5 0 001 12.5v4A1.5 1.5 0 002.5 18h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0010 11H2.5zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 3A1.5 1.5 0 0010 4.5v4a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 0017.5 3h-6zm1 4a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM11.5 11a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h6a1.5 1.5 0 01-1.5-1.5v-4a1.5 1.5 0 01-1.5-1.5h-6z" clip-rule="evenodd"></path></svg><span class="mr-2 text-sm font-medium text-gray-500 dark:text-gray-400">分类</span><span class="text-sm font-medium">${ssrInterpolate(currentCategory.value || "请选择分类...")}</span></div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="${ssrRenderClass([
          "h-4 w-4 text-gray-400 transition-transform duration-200",
          categoryMenuOpen.value ? "rotate-180" : ""
        ])}"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"></path></svg></button>`);
        if (categoryMenuOpen.value) {
          _push(`<div class="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"><div class="py-1"><!--[-->`);
          ssrRenderList(categories.value, (cat) => {
            _push(`<button type="button" class="${ssrRenderClass([
              "w-full px-4 py-2 text-left text-sm transition-colors",
              category.value === String(cat.id) ? "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            ])}">${ssrInterpolate(cat.name)}</button>`);
          });
          _push(`<!--]--></div></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div></div><div>`);
        _push(ssrRenderComponent(_sfc_main$1, {
          modelValue: body.value,
          "onUpdate:modelValue": ($event) => body.value = $event
        }, null, _parent));
        _push(`</div><div class="flex items-center justify-end gap-3 pt-4"><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"> Cancel </button><button type="submit"${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""} class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50">`);
        if (loading.value) {
          _push(`<svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
        } else {
          _push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="mr-2 h-4 w-4"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>`);
        }
        _push(` ${ssrInterpolate(isEdit.value ? "Save Changes" : "Create Post")}</button></div></form>`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("src/views/BlogEditView.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
