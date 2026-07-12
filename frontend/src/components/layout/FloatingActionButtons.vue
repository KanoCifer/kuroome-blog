<template>
  <div
    class="transition-transform duration-800 ease-in-out"
    :class="!floatingIn ? 'translate-x-full' : 'translate-x-0'"
  >
    <!-- Settings button -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('openSettings')"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="偏好设置"
      >
        <SettingIcon
          class="fab-icon text-primary group-hover:text-primary-foreground"
        />
        <span class="fab-label">偏好设置</span>
      </button>
    </div>

    <!-- New Post button -->
    <div class="fixed top-16 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToNewPost"
        class="fab group bg-primary hover:bg-primary/90"
        aria-label="写文章"
      >
        <svg
          class="fab-icon text-primary-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span class="fab-label text-primary-foreground">新建</span>

      </button>
    </div>

    <!-- Like button -->
    <div class="fixed top-28 right-4 z-50 flex flex-col gap-2">
      <button
        @click="handleLike"
        :class="[
          'fab group',
          liked ? 'bg-rose-500' : 'bg-primary hover:bg-rose-500',
        ]"
        aria-label="点赞"
      >
        <svg
          :class="['fab-icon text-primary-foreground']"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
        <span class="fab-label text-primary-foreground">{{ likesCount }}</span>
      </button>
    </div>

    <!-- Friend links button -->
    <div class="fixed top-40 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('goToFriendLinks')"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="友情链接"
      >
        <svg
          class="fab-icon text-primary group-hover:text-primary-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          />
        </svg>
        <span class="fab-label">友链</span>
      </button>
    </div>

    <!-- Edit Layout button -->
    <div class="fixed top-52 right-4 z-50 flex flex-col gap-2">
      <button
        @click="toggleEditLayout"
        class="fab group bg-secondary hover:bg-primary"
        :aria-label="layoutStore.isEditing ? '退出编辑' : '编辑布局'"
      >
        <svg
          class="fab-icon text-primary group-hover:text-primary-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <span class="fab-label">编辑布局</span>
      </button>
    </div>

    <!-- Switch to mobile button -->
    <div class="fixed top-64 right-4 z-50 flex flex-col gap-2">
      <button
        @click="$emit('switchToMobile')"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="切换到移动版"
      >
        <svg
          class="fab-icon text-primary group-hover:text-primary-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span class="fab-label">移动版</span>
      </button>
    </div>

    <!-- RSS button -->
    <div class="fixed top-76 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToRss"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="RSS"
      >
        <RssIcon class="fab-icon text-primary group-hover:text-primary-foreground" />
        <span class="fab-label">RSS</span>
      </button>
    </div>

    <!-- Subscription button -->
    <div class="fixed top-88 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToSubscription"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="订阅管理"
      >
        <CreditCard class="fab-icon text-primary group-hover:text-primary-foreground" />
        <span class="fab-label">订阅</span>
      </button>
    </div>

    <!-- Image Toolbox button -->
    <div class="fixed top-100 right-4 z-50 flex flex-col gap-2">
      <button
        @click="goToImageToolbox"
        class="fab group bg-secondary hover:bg-primary"
        aria-label="图片工具"
      >
        <IconTooling class="fab-icon text-primary group-hover:text-primary-foreground" />
        <span class="fab-label">图片工具</span>
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

const liked = ref(false);
const likesCount = ref(0);

function toggleEditLayout() {
  if (layoutStore.isEditing) {
    layoutStore.cancelEditing();
  } else {
    layoutStore.startEditing();
  }
}

const goToNewPost = () => {
  router.push('/blog/new');
};

const handleLike = async () => {
  try {
    await socialGateway.likeOnce({ likes_count: 1 });
    liked.value = true;
    likesCount.value += 1;
    notifier.success('感谢你的喜欢 ❤️');
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

const goToRss = () => {
  router.push('/rss');
};

const goToSubscription = () => {
  router.push('/subscription');
};

const goToImageToolbox = () => {
  router.push('/toolbox/image-toolbox');
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

defineEmits<{
  (e: 'openSettings'): void;
  (e: 'goToFriendLinks'): void;
  (e: 'switchToMobile'): void;
}>();
</script>

<style scoped>
.fab {
  display: flex;
  height: 2.5rem;
  align-items: center;
  overflow: hidden;
  border-radius: 9999px;
  padding: 0 0.625rem;
  cursor: pointer;
  transition: transform 300ms ease-out;
}

.fab-icon {
  height: 1.25rem;
  width: 1.25rem;
  flex-shrink: 0;
  transition: color 300ms ease-out;
}

.fab-label {
  max-width: 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0;
  color: white;
  transition:
    max-width 300ms ease-out,
    margin 300ms ease-out,
    opacity 300ms ease-out;
}

.fab:hover {
  transform: scale(1);
}

.fab:hover .fab-label {
  max-width: 10rem;
  margin-left: 0.375rem;
  opacity: 1;
}

.fab:active {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .fab,
  .fab-icon,
  .fab-label {
    transition-duration: 0ms;
  }
}
</style>
