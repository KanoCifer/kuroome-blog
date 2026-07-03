<template>
  <div
    class="transition-transform duration-800 ease-in-out"
    :class="!floatingIn ? 'translate-x-full' : 'translate-x-0'"
  >
    <!-- Buttons column — single fixed container, flex gap handles spacing -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <button
        v-for="(btn, i) in buttons"
        :key="btn.key"
        @click="dispatch(btn)"
        :title="btn.title"
        :class="[
          'group flex h-10 items-center overflow-hidden rounded-full px-2.5 transition-all duration-300 ease-out',
          btn.variant === 'primary'
            ? 'bg-primary hover:bg-primary/90'
            : 'bg-secondary hover:bg-primary',
        ]"
      >
        <component
          :is="btn.icon"
          :class="[
            'h-5 w-5 shrink-0 transition-colors duration-300',
            btn.variant === 'primary'
              ? 'text-primary-foreground'
              : 'text-primary group-hover:text-primary-foreground',
          ]"
        />
        <span
          :class="[
            'max-w-0 min-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100',
            btn.variant === 'primary'
              ? 'text-primary-foreground'
              : 'text-primary-foreground',
          ]"
        >
          {{ btn.label }}
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

interface FabButton {
  key: string;
  icon: object;
  label: string;
  title: string;
  variant?: 'primary';
  emit?: 'openSettings' | 'goToFriendLinks' | 'switchToMobile';
  action?: () => void;
}

const emit = defineEmits<{
  (e: 'openSettings'): void;
  (e: 'goToFriendLinks'): void;
  (e: 'switchToMobile'): void;
}>();

const router = useRouter();
const notifier = useNotificationStore();
const layoutStore = useCardLayoutStore();
const floatingIn = ref(false);

function dispatch(btn: FabButton) {
  if (btn.emit) {
    emit(btn.emit);
  } else if (btn.action) {
    btn.action();
  }
}

// --- Like state ---
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

const toggleEditLayout = () => {
  if (layoutStore.isEditing) {
    layoutStore.cancelEditing();
  } else {
    layoutStore.startEditing();
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

// --- Button configuration ---
const buttons = computed<FabButton[]>(() => [
  {
    key: 'settings',
    icon: SettingIcon,
    label: '偏好设置',
    title: '偏好设置',
    emit: 'openSettings',
  },
  {
    key: 'new-post',
    icon: IconNewPost,
    label: '新建',
    title: '写文章',
    variant: 'primary',
    action: goToNewPost,
  },
  {
    key: 'like',
    icon: IconHeart,
    label: '',
    title: '点赞',
    action: handleLike,
  },
  {
    key: 'edit-layout',
    icon: IconEditLayout,
    label: '编辑布局',
    title: layoutStore.isEditing ? '退出编辑' : '编辑布局',
    action: toggleEditLayout,
  },
  {
    key: 'friend-links',
    icon: IconFriendLinks,
    label: '友链',
    title: '友情链接',
    emit: 'goToFriendLinks',
  },
  {
    key: 'switch-mobile',
    icon: IconSwitchMobile,
    label: '移动版',
    title: '切换到移动版',
    emit: 'switchToMobile',
  },
  {
    key: 'rss',
    icon: RssIcon,
    label: 'RSS',
    title: 'RSS',
    action: goToRss,
  },
  {
    key: 'subscription',
    icon: CreditCard,
    label: '订阅',
    title: '订阅管理',
    action: goToSubscription,
  },
  {
    key: 'image-toolbox',
    icon: IconTooling,
    label: '图片工具',
    title: '图片工具',
    action: goToImageToolbox,
  },
]);

// --- Inline SVG components ---
const IconNewPost = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>`,
};

const IconFriendLinks = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`,
};

const IconEditLayout = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>`,
};

const IconSwitchMobile = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>`,
};

const IconHeart = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>`,
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
</script>
