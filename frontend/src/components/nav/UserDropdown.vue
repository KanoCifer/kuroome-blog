<template>
  <div
    @click="openUserMenu"
    @mouseenter="openUserMenu"
    @mouseleave="closeUserMenu"
    class="hover:border-primary mb-8 flex items-center gap-4 rounded-3xl p-2 px-2 transition-colors hover:border-2"
  >
    <!-- 下拉菜单 -->
    <transition
      enter-active-class="transition-all transform-gpu duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all transform-gpu duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isUserMenuOpen"
        class="bg-muted/60 dark:bg-accent ring-primary absolute top-16 right-0 z-9999 mt-2 w-auto rounded-3xl p-px shadow-lg ring-2 dark:shadow-gray-50/5"
      >
        <div class="bg-muted dark:bg-card rounded-[23px]">
          <ol>
            <li v-for="(item, idx) in visibleItems" :key="idx">
              <!-- 分隔线 -->
              <div
                v-if="item.divider"
                class="bg-border dark:bg-border mx-4 h-px"
              />
              <!-- 路由链接 -->
              <RouterLink
                v-else-if="item.to"
                :to="item.to"
                @click="closeUserMenuImmediately"
                class="text-foreground dark:text-foreground dark:hover:bg-accent hover:bg-primary flex items-center gap-2 rounded-full px-4 py-2 font-serif transition-colors duration-300 hover:text-white"
                :class="item.class"
              >
                <component :is="item.icon" class="h-4 w-4" />
                {{ item.label }}
              </RouterLink>
              <!-- 操作按钮 -->
              <button
                v-else
                @click.prevent="handleItemClick(item)"
                :disabled="item.disabled"
                class="flex w-full cursor-pointer items-center gap-2 px-4 py-2 font-serif"
                :class="item.class"
              >
                <component :is="item.icon" class="h-4 w-4" />
                {{ item.label }}
              </button>
            </li>
          </ol>
        </div>
      </div>
    </transition>

    <!-- 头像 -->
    <img
      v-if="auth.isAuthenticated && auth.user?.photo"
      :src="avatarUrl"
      :alt="currentUserName"
      class="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-white/50 dark:ring-gray-700/50"
    />
    <img
      v-else
      src="/images/about.webp"
      alt="Default Avatar"
      class="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-white/50 dark:ring-gray-700/50"
    />

    <!-- 用户名 -->
    <div class="flex items-baseline gap-2">
      <span
        class="text-foreground dark:text-foreground font-serif text-2xl font-bold"
      >
        {{ currentUserName }}
      </span>
      <ChevronDownIcon
        class="text-foreground h-3 w-3 transform-gpu transition-transform"
        :class="{ 'rotate-180': isUserMenuOpen }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from '@/components/icons';
import { useAuthStore } from '@/auth/stores/auth';
import type { Component } from 'vue';
import { computed, onUnmounted, ref } from 'vue';

export interface DropdownItem {
  icon?: Component;
  label?: string;
  to?: string;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  /** 仅在管理员时显示 */
  adminOnly?: boolean;
  /** 额外的 CSS class */
  class?: string;
}

const props = defineProps<{
  items: DropdownItem[];
  guestItems?: DropdownItem[];
}>();

const auth = useAuthStore();

const isUserMenuOpen = ref(false);
let userMenuCloseTimeout: ReturnType<typeof setTimeout> | null = null;

const currentUserName = computed(() => {
  return auth.isAuthenticated ? auth.user?.name || '用户' : '游客';
});

const visibleItems = computed(() => {
  if (!auth.isAuthenticated) return props.guestItems ?? [];
  return props.items.filter((item) => !item.adminOnly || auth.user?.is_admin);
});

const openUserMenu = () => {
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
    userMenuCloseTimeout = null;
  }
  isUserMenuOpen.value = true;
};

const closeUserMenu = () => {
  userMenuCloseTimeout = setTimeout(() => {
    isUserMenuOpen.value = false;
  }, 150);
};

const closeUserMenuImmediately = () => {
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
    userMenuCloseTimeout = null;
  }
  isUserMenuOpen.value = false;
};

const handleItemClick = (item: DropdownItem) => {
  closeUserMenuImmediately();
  item.onClick?.();
};

const avatarUrl = computed(() => {
  if (auth.user?.photo?.startsWith('http')) {
    return auth.user.photo;
  }
  if (auth.user?.photo) {
    return `/api/v1/media/${auth.user.photo}`;
  }
  return '/api/v1/media/default.png';
});

onUnmounted(() => {
  if (userMenuCloseTimeout) {
    clearTimeout(userMenuCloseTimeout);
  }
});
</script>
