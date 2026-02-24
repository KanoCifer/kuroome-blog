<script setup lang="ts">
import request from "@/request";
import { useAuthStore } from "@/stores/auth";
import type { Message } from "@/types";
import { formatDate } from "@/utils/formatdate";
import { onMounted, ref } from "vue";

const name = ref<string>("Anonymous");
const message = ref<string>("");
const messages = ref<Message[]>([]);
const loading = ref<boolean>(false);
const submitting = ref<boolean>(false);
const successMessage = ref<string>("");
const errors = ref<{ name?: string[]; message?: string[] }>({});
const auth = useAuthStore();
//填充留言用户名称
if (auth.isAuthenticated) {
  name.value = auth.user?.username || "Anonymous";
}

const fetchMessages = async () => {
  loading.value = true;
  try {
    const response = await request.get("/messages");
    const data = response.data;
    if (data.status === "success") {
      messages.value = data.data.messages;
      console.log("Fetched messages:", messages.value);
    }
  } catch (error) {
    console.error("Failed to fetch messages:", error);
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  errors.value = {};
  successMessage.value = "";
  submitting.value = true;

  try {
    console.log("Submitting message...", {
      name: name.value,
      message: message.value,
    });

    const response = await request.post("/messages", {
      name: name.value,
      message: message.value,
    });

    console.log("Response status:", response.status);

    const data = response.data;
    console.log("Response data:", data);

    if (data.status === "success") {
      successMessage.value = data.message;
      name.value = "";
      message.value = "";
      await fetchMessages();
    } else if (data.status === "error" && data.errors) {
      errors.value = data.errors;
    } else {
      console.warn("Unexpected response:", data);
    }
  } catch (error) {
    console.error("Failed to submit message:", error);
    errors.value = {
      name: ["Network error. Please check console for details."],
    };
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchMessages();
});
</script>

<template>
  <div
    class="mx-auto mt-12 mb-4 rounded-3xl bg-white/80 p-4 py-8 shadow-lg ring-1 ring-gray-900/5 backdrop-blur-sm transition-all hover:scale-[1.01] hover:shadow-xl dark:bg-gray-800/80"
  >
    <div class="mx-4 my-2">
      <h2
        class="flex items-center gap-3 font-serif text-2xl font-bold text-gray-800 dark:text-gray-100"
      >
        Message Board
        <span
          class="items-baseline text-sm text-gray-500 italic dark:text-gray-400"
        >
          Say hello now!
        </span>
        <span
          class="ml-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          {{ messages.length }}
        </span>
      </h2>

      <form @submit.prevent="handleSubmit" class="mt-4">
        <div class="grid gap-6 md:grid-cols-2">
          <div class="form-group md:col-span-2">
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Username
            </label>
            <input
              v-model="name"
              type="text"
              class="w-full rounded-3xl border border-gray-300 bg-gray-50 px-3 py-2 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
              :disabled="submitting"
            />
            <div
              v-if="errors.name"
              class="mt-1 flex items-center text-sm text-red-500"
            >
              {{ errors.name[0] }}
            </div>
          </div>

          <div class="form-group md:col-span-2">
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Message
            </label>
            <textarea
              v-model="message"
              rows="3"
              class="w-full rounded-3xl border border-gray-300 bg-gray-50 px-3 py-2 transition-transform focus:scale-[1.01] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
              :disabled="submitting"
            ></textarea>
            <div
              v-if="errors.message"
              class="mt-1 flex items-center text-sm text-red-500"
            >
              {{ errors.message[0] }}
            </div>
          </div>

          <div>
            <button
              type="submit"
              class="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 ring-offset-2 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:ring-offset-gray-800"
              :disabled="submitting"
            >
              {{ submitting ? "Submitting..." : "Submit" }}
            </button>
          </div>
        </div>

        <div
          v-if="successMessage"
          class="mt-4 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400"
        >
          {{ successMessage }}
        </div>
      </form>

      <div
        v-if="loading"
        class="mt-6 text-center text-gray-500 dark:text-gray-400"
      >
        Loading messages...
      </div>

      <div v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'mt-6 rounded-3xl p-4 shadow-sm transition-all duration-300 hover:shadow-md',
            msg.from_admin
              ? 'bg-linear-to-br from-purple-50 via-fuchsia-50 to-pink-50 ring-2 ring-purple-400/50 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-pink-950/20 dark:ring-purple-500/40'
              : 'bg-gray-50 dark:bg-gray-700/30',
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                :class="[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  msg.from_admin
                    ? 'bg-linear-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-md shadow-purple-500/30 dark:from-purple-400 dark:via-fuchsia-400 dark:to-pink-400'
                    : 'bg-linear-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-sky-900 dark:to-blue-900 dark:text-blue-300',
                ]"
              >
                {{ msg.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3
                  :class="[
                    'text-lg font-semibold',
                    msg.from_admin
                      ? 'text-purple-900 dark:text-purple-100'
                      : 'text-gray-900 dark:text-gray-100',
                  ]"
                >
                  {{ msg.name }}
                </h3>
                <span
                  v-if="msg.from_admin"
                  class="inline-flex items-center gap-1 rounded-md bg-linear-to-r from-purple-500 via-fuchsia-500 to-pink-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-1 ring-purple-400/50 dark:from-purple-400 dark:via-fuchsia-400 dark:to-pink-400 dark:ring-purple-300/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Admin
                </span>
              </div>
            </div>
            <span
              :class="[
                'text-sm',
                msg.from_admin
                  ? 'text-purple-600/70 dark:text-purple-300/70'
                  : 'text-gray-500 dark:text-gray-400',
              ]"
            >
              {{ formatDate(msg.created_at) }}
            </span>
          </div>
          <p
            :class="[
              'mt-3',
              msg.from_admin
                ? 'text-purple-800 dark:text-purple-200'
                : 'text-gray-700 dark:text-gray-300',
            ]"
          >
            {{ msg.message }}
          </p>
        </div>

        <div
          v-if="messages.length === 0 && !loading"
          class="mt-6 text-center text-gray-500 dark:text-gray-400"
        >
          No messages yet. Be the first to say hello!
        </div>
      </div>
    </div>
  </div>
</template>
