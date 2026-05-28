<script setup lang="ts">
import { messageService } from '@/service/messageService';
import { useAuthStore } from '@/stores/auth';
import type { Message } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { onMounted, ref } from 'vue';

const name = ref<string>('Anonymous');
const message = ref<string>('');
const messages = ref<Message[]>([]);
const loading = ref<boolean>(false);
const submitting = ref<boolean>(false);
const successMessage = ref<string>('');
const errors = ref<{ name?: string[]; message?: string[] }>({});
const auth = useAuthStore();
//填充留言用户名称
if (auth.isAuthenticated) {
  name.value = auth.user?.username || 'Anonymous';
}

const fetchMessages = async () => {
  loading.value = true;
  try {
    const response = await messageService.getMessages();
    const data = response.data;
    if (data.status === 'success') {
      messages.value = data.data.messages;
      console.log('Fetched messages:', messages.value);
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  errors.value = {};
  successMessage.value = '';
  submitting.value = true;

  try {
    console.log('Submitting message...', {
      name: name.value,
      message: message.value,
    });

    const response = await messageService.postMessage({
      name: name.value,
      message: message.value,
    });

    console.log('Response status:', response.status);

    const data = response.data;
    console.log('Response data:', data);

    if (data.status === 'success') {
      successMessage.value = data.message;
      name.value = '';
      message.value = '';
      await fetchMessages();
    } else if (data.status === 'error' && data.errors) {
      errors.value = data.errors;
    } else {
      console.warn('Unexpected response:', data);
    }
  } catch (error) {
    console.error('Failed to submit message:', error);
    errors.value = {
      name: ['Network error. Please check console for details.'],
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
    class="bg-card/80 ring-border mx-auto mt-12 mb-4 rounded-3xl p-4 py-8 shadow-lg ring-1 hover:shadow-xl motion-safe:transition-shadow motion-safe:duration-300 dark:bg-gray-800/80"
  >
    <div class="mx-4 my-2">
      <h2
        class="text-foreground dark:text-foreground flex items-center gap-3 font-serif text-2xl font-bold"
      >
        Message Board
        <span
          class="text-muted-foreground dark:text-muted-foreground items-baseline text-sm italic"
        >
          Say hello now!
        </span>
        <span
          class="bg-muted text-muted-foreground dark:text-muted-foreground ml-2 rounded-full px-3 py-1 text-sm font-medium dark:bg-gray-800"
        >
          {{ messages.length }}
        </span>
      </h2>
      <p class="my-4">
        <span
          class="border-primary/30 bg-primary/20 text-primary rounded-full border px-4 py-2 text-xs font-medium"
          >*评论发布后请等待管理员审核</span
        >
      </p>

      <form @submit.prevent="handleSubmit" class="mt-4">
        <div class="flex flex-col space-y-4">
          <div class="form-group">
            <label
              for="username-input"
              class="text-foreground dark:text-foreground mb-2 block text-sm font-semibold"
            >
              Username
            </label>
            <input
              id="username-input"
              v-model="name"
              type="text"
              class="border-border bg-muted focus:border-ring focus:ring-ring w-full rounded-3xl border px-3 py-2 focus:ring-2 focus:outline-none motion-safe:transition-all motion-safe:duration-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
              :disabled="submitting"
              placeholder="Your name"
            />
            <div
              v-if="errors.name"
              aria-live="assertive"
              class="text-destructive mt-1 flex items-center text-sm"
            >
              {{ errors.name[0] }}
            </div>
          </div>

          <div class="form-group">
            <label
              for="message-input"
              class="text-foreground dark:text-foreground mb-2 block text-sm font-semibold"
            >
              Message
            </label>
            <textarea
              id="message-input"
              v-model="message"
              rows="3"
              class="border-border bg-muted focus:border-ring focus:ring-ring w-full rounded-3xl border px-3 py-2 focus:ring-2 focus:outline-none motion-safe:transition-all motion-safe:duration-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
              :disabled="submitting"
              placeholder="发布后请等待审核"
            ></textarea>
            <div
              v-if="errors.message"
              aria-live="assertive"
              class="text-destructive mt-1 flex items-center text-sm"
            >
              {{ errors.message[0] }}
            </div>
          </div>

          <div>
            <button
              type="submit"
              class="bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 focus:ring-ring flex cursor-pointer items-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg ring-offset-2 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-800"
              :disabled="submitting"
            >
              {{ submitting ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </div>

        <div
          v-if="successMessage"
          aria-live="polite"
          class="bg-success/10 text-success mt-4 rounded-lg p-4 dark:bg-green-900/20 dark:text-green-400"
        >
          {{ successMessage }}
        </div>
      </form>

      <div
        v-if="loading"
        role="status"
        class="text-muted-foreground dark:text-muted-foreground mt-6 text-center"
      >
        Loading messages...
      </div>

      <div v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'mt-6 rounded-3xl p-4 shadow-sm hover:shadow-md motion-safe:transition-all motion-safe:duration-300',
            msg.from_admin
              ? 'bg-violet-50 ring-2 ring-violet-400/50 dark:bg-violet-950/30 dark:ring-violet-500/40'
              : 'bg-muted dark:bg-gray-700/30',
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                :class="[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  msg.from_admin
                    ? 'bg-primary text-primary-foreground'
                    : 'text-primary bg-linear-to-br from-blue-50 to-blue-100 dark:from-sky-900 dark:to-blue-900 dark:text-blue-300',
                ]"
              >
                {{ msg.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3
                  :class="[
                    'text-lg font-semibold',
                    msg.from_admin
                      ? 'text-violet-900 dark:text-violet-100'
                      : 'text-foreground dark:text-foreground',
                  ]"
                >
                  {{ msg.name }}
                </h3>
                <span
                  v-if="msg.from_admin"
                  class="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold shadow-sm"
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
                  ? 'text-violet-600/70 dark:text-violet-300/70'
                  : 'text-muted-foreground dark:text-muted-foreground',
              ]"
            >
              {{ formatDate(msg.created_at) }}
            </span>
          </div>
          <p
            :class="[
              'mt-3',
              msg.from_admin
                ? 'text-violet-800 dark:text-violet-200'
                : 'text-foreground dark:text-foreground',
            ]"
          >
            {{ msg.message }}
          </p>
        </div>

        <div
          v-if="messages.length === 0 && !loading"
          class="text-muted-foreground dark:text-muted-foreground mt-6 text-center"
        >
          No messages yet. Be the first to say hello!
        </div>
      </div>
    </div>
  </div>
</template>
