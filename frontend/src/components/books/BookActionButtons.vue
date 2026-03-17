<script setup lang="ts">
import type { BookItem } from "@/types";
import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
import { Modal } from "ant-design-vue";
import { computed, createVNode } from "vue";

const props = withDefaults(
  defineProps<{
    book: BookItem;
    pending?: boolean;
  }>(),
  {
    pending: false,
  },
);

const bookDoubanUrl = computed(() => {
  return `https://book.douban.com/subject_search?search_text=${encodeURIComponent(props.book.title)}`;
});

const emit = defineEmits<{
  "toggle-status": [book: BookItem];
  "delete-book": [book: BookItem];
  "edit-book": [book: BookItem];
}>();

const showDeleteConfirm = () => {
  Modal.confirm({
    title: "Are you sure delete this Book?",
    icon: createVNode(ExclamationCircleOutlined),
    content: "The action cannot be undone.",
    okText: "Yes",
    okType: "danger",
    cancelText: "No",
    centered: true,
    onOk() {
      emit("delete-book", props.book);
    },
    onCancel() {},
  });
};
</script>

<template>
  <div
    class="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100 sm:top-5 sm:right-5"
  >
    <button
      :disabled="pending"
      class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
      @click="emit('toggle-status', book)"
    >
      <svg
        v-if="book.iscompleted"
        class="h-4 w-4 text-gray-500 transition-colors group-hover:text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
      <svg
        v-else
        class="h-4 w-4 text-gray-500 transition-colors group-hover:text-green-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
      {{ book.iscompleted ? "Undo" : "Finish" }}
    </button>

    <button
      :disabled="pending"
      class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
      @click="emit('edit-book', book)"
    >
      <svg
        class="h-4 w-4 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      Edit
    </button>

    <button
      :disabled="pending"
      class="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/50 px-4 py-2 text-sm font-medium text-red-600 backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/30"
      @click="showDeleteConfirm()"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      Delete
    </button>

    <a
      class="inline-flex items-center gap-1 rounded-xl bg-[#00B51D]/10 px-3 py-2 text-sm font-bold text-[#00B51D] hover:bg-[#00B51D]/20 dark:bg-[#00B51D]/20 dark:text-[#00B51D] dark:hover:bg-[#00B51D]/30"
      :href="bookDoubanUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      Douban
    </a>
  </div>
</template>
