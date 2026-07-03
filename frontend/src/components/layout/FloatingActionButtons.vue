<template>
  <div
    class="transition-transform duration-800 ease-in-out"
    :class="!floatingIn ? 'translate-x-full' : 'translate-x-0'"
  >
    <!-- Settings button -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('openSettings')"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="偏好设置"
      >
        <SettingIcon
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        />
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          偏好设置
        </span>
      </button>
    </div>

    <!-- Friend links button -->
    <div class="fixed top-16 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('goToFriendLinks')"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="友情链接"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          友链
        </span>
      </button>
    </div>

    <!-- New Post button -->
    <div class="fixed top-28 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToNewPost"
        class="group bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="写文章"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5 shrink-0 text-white"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          新建
        </span>
      </button>
    </div>

    <!-- Like button -->
    <div class="fixed top-[7.5rem] right-4 z-50 flex flex-col gap-2">
      <button
        @click="handleLike"
        class="group bg-secondary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out hover:bg-rose-500"
        title="点赞"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="[
            'h-5 w-5 shrink-0 transition-colors duration-300',
            liked
              ? 'fill-rose-500 text-rose-500'
              : 'text-primary group-hover:text-white',
          ]"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
        <span
          :class="[
            'max-w-0 min-w-0 text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100',
            liked ? 'text-rose-500' : 'text-white',
          ]"
        >
          {{ likesCount }}
        </span>
      </button>
    </div>

    <!-- Edit Layout button -->
    <div class="fixed top-40 right-4 z-50 flex flex-col gap-2">
      <button
        @click="toggleEditLayout"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        :title="layoutStore.isEditing ? '退出编辑' : '编辑布局'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        >
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-28 group-hover:opacity-100"
        >
          编辑布局
        </span>
      </button>
    </div>

    <!-- Switch to mobile button -->
    <div class="fixed top-52 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('switchToMobile')"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="切换到移动版"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-28 group-hover:opacity-100"
        >
          移动版
        </span>
      </button>
    </div>

    <!-- RSS button -->
    <div class="fixed top-64 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToRss"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="RSS"
      >
        <RssIcon
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        />
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          RSS
        </span>
      </button>
    </div>

    <!-- Subscription button -->
    <div class="fixed top-76 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToSubscription"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="订阅管理"
      >
        <CreditCard
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        />
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          订阅
        </span>
      </button>
    </div>

    <!-- Image Toolbox button -->
    <div class="fixed top-88 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToImageToolbox"
        class="group bg-secondary hover:bg-primary flex h-10 cursor-pointer items-center overflow-hidden rounded-full px-2.5 shadow-md transition-all duration-300 ease-out"
        title="图片工具"
      >
        <IconTooling
          class="text-primary h-5 w-5 shrink-0 transition-colors duration-300 group-hover:text-white"
        />
        <span
          class="max-w-0 min-w-0 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100"
        >
          图片工具
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconTooling, RssIcon } from '@/components/icons';
import { socialGateway } from '@/api/blog';
import { useCardLayoutStore } from '@/stores/cardLayout';
import { useNotificationStore } from '@/stores/notification';
import SettingIcon from '@/components/icons/SettingIcon.vue';
import { AxiosError } from 'axios';
import { CreditCard } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const notifier = useNotificationStore();
const layoutStore = useCardLayoutStore();
const floatingIn = ref(false);

function toggleEditLayout() {
  if (layoutStore.isEditing) {
    layoutStore.cancelEditing();
  } else {
    layoutStore.startEditing();
  }
}

const liked = ref(false);
const likesCount = ref(0);

const goToNewPost = () => {
  router.push('/blog/new');
};

const handleLike = async () => {
  try {
    await socialGateway.likeOnce({ likes_count: 1 });
    liked.value = true;
    likesCount.value += 1;
  } catch (error) {
    let errorMsg = '点赞失败，请稍后重试';
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        errorMsg = '🥳今天已经点赞很多次啦，明天再试试吧！';
      }
    }
    notifier.error(errorMsg);
    console.error('Failed to update likes count:', error);
  }
};

onMounted(() => {
  setTimeout(() => {
    floatingIn.value = true;
  }, 800);

  socialGateway
    .getLikes()
    .then((response) => {
      likesCount.value = response.likes_count || 0;
    })
    .catch(() => {
      notifier.error('获取点赞数失败，请稍后再试');
    });
});

const goToRss = () => {
  router.push('/rss');
};

const goToSubscription = () => {
  router.push('/subscription');
};

const goToImageToolbox = () => {
  router.push('/toolbox/image-toolbox');
};

defineEmits<{
  (e: 'openSettings'): void;
  (e: 'goToFriendLinks'): void;
  (e: 'switchToMobile'): void;
}>();
</script>
