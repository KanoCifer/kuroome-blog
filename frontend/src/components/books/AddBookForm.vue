<template>
  <!-- 添加书籍表单 -->
  <div
    class="mb-8 rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-gray-900/5 transition-shadow hover:shadow-2xl dark:bg-gray-800/80 dark:ring-white/10"
  >
    <div
      class="mb-6 flex cursor-pointer items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700"
      @click="isCollapsed = !isCollapsed"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="h-6 w-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
      <p
        class="mb-0 items-center font-serif text-xl font-bold text-gray-900 dark:text-white"
      >
        {{ isEditing ? "Edit Book" : "Add to ReadingList" }}
      </p>
      <button
        v-if="isEditing"
        @click.stop="resetForm"
        class="rounded-4xl border bg-rose-100 px-4 py-2 text-sm text-rose-500 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
      >
        取消
      </button>
      <button
        @click.stop="isCollapsed = !isCollapsed"
        class="ml-auto text-sm text-gray-500 transition-transform hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          :class="[
            'h-5 w-5 transition-transform',
            isCollapsed ? '' : 'rotate-180',
          ]"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
    </div>

    <Transition name="accordion">
      <form v-if="!isCollapsed" @submit.prevent="submitForm" class="space-y-5">
        <div class="grid gap-6 md:grid-cols-2">
          <div class="group">
            <input
              v-model="form.title"
              type="text"
              autocomplete="off"
              placeholder="Book Title"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            />
          </div>
          <div class="group">
            <input
              v-model="form.author"
              type="text"
              autocomplete="off"
              placeholder="Author"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-800"
            />
          </div>
        </div>

        <label
          class="group relative flex cursor-pointer items-center rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-gray-50/50 dark:border-gray-700 dark:bg-gray-700/30 dark:hover:bg-gray-700/30"
        >
          <input
            v-model="form.iscompleted"
            type="checkbox"
            class="peer sr-only"
          />
          <div
            class="mr-4 flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-300 bg-white transition-all peer-checked:border-blue-500 peer-checked:bg-blue-500 dark:border-gray-500 dark:bg-gray-700"
          >
            <svg
              :class="[
                'z-50 h-4 w-4 text-white transition-opacity peer-checked:opacity-100',
                form.iscompleted ? 'opacity-100' : 'opacity-0',
              ]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >Mark as completed</span
          >
        </label>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="submitting"
            :class="[
              'inline-flex items-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus:outline-none',
              submitting
                ? 'cursor-not-allowed opacity-50'
                : 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800',
            ]"
          >
            {{ isEditing ? "Update Book" : "Add Book" }}
          </button>
        </div>
      </form>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import request from "@/request";
import { useNotificationStore } from "@/stores/notification";
import type { ADDBookForm, BookItem } from "@/types";
import { reactive, ref } from "vue";
const emit = defineEmits(["book-added", "book-updated"]);

const submitting = ref<boolean>(false);
const isEditing = ref<boolean>(false);
const isCollapsed = ref<boolean>(true);
const editingBookId = ref<number | null>(null);
const form = reactive<ADDBookForm>({
  title: "",
  author: "",
  iscompleted: false,
});

async function submitForm() {
  // 防止重复提交 & 简单校验
  if (!form.title.trim() || !form.author.trim()) {
    useNotificationStore().error("标题和作者不能为空");
    return;
  }
  if (submitting.value) return;
  submitting.value = true;

  try {
    if (isEditing.value && editingBookId.value) {
      // 编辑模式：更新书籍
      await request.put(`/books/${editingBookId.value}`, {
        title: form.title,
        author: form.author,
        iscompleted: form.iscompleted,
      });
      useNotificationStore().success("书籍更新成功");
      emit("book-updated"); // 通知父组件刷新书籍列表
      resetForm();
    } else {
      // 添加模式：添加书籍
      await request.post("/books/addbook", {
        title: form.title,
        author: form.author,
        iscompleted: form.iscompleted,
      });
      useNotificationStore().success("书籍添加成功");
      emit("book-added"); // 通知父组件刷新书籍列表
      resetForm();
    }
  } catch {
    useNotificationStore().error(
      isEditing.value
        ? "更新书籍失败，请稍后重试。"
        : "添加书籍失败，请稍后重试。",
    );
  } finally {
    submitting.value = false;
  }
}

// 重置表单
function resetForm() {
  form.title = "";
  form.author = "";
  form.iscompleted = false;
  isEditing.value = false;
  editingBookId.value = null;
}

// 开始编辑书籍
function startEditing(book: BookItem) {
  isEditing.value = true;
  isCollapsed.value = false; // 编辑时自动展开
  editingBookId.value = book.id;
  form.title = book.title;
  form.author = book.author;
  form.iscompleted = book.iscompleted;
}

// 暴露 startEditing 方法给父组件
defineExpose({ startEditing });
</script>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.3s ease-out;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
