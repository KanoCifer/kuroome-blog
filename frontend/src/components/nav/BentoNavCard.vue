<template>
  <BentoCard
    :layoutId="props.layoutId"
    :initial="props.initial"
    :animate="props.animate"
    :transition="props.transition"
  >
    <!-- 用户信息 + 下拉菜单 -->
    <UserDropdown :items="userMenuItems" :guest-items="guestMenuItems" />

    <!-- 导航分类 -->
    <div class="text-secondary-foreground dark:text-muted-foreground mb-4 px-3 text-sm font-bold tracking-wider">
      GENERAL
    </div>

    <!-- 导航项列表 -->
    <div class="relative">
      <!-- 导航指示器 -->
      <Motion
        class="bg-primary absolute top-0 left-0 h-14 w-full transform-gpu rounded-3xl shadow-sm will-change-transform"
        :animate="{ y: hoverNavIndex * (52 + 4) }"
        :transition="{ visualDuration: 0.3, bounce: 0.15, type: 'spring' }"
        style="z-index: -1"
      />

      <ol class="flex flex-col gap-1">
        <li v-for="(item, index) in navItems" :key="item.path" @mouseenter="hoverNavIndex = index">
          <RouterLink
            :to="item.path"
            class="relative z-10 flex items-center gap-4 rounded-3xl py-3.5 pr-5 pl-6 font-medium transition-colors duration-150"
            :class="
              hoverNavIndex === index
                ? 'text-white'
                : 'text-foreground dark:text-muted-foreground dark:hover:text-foreground'
            "
          >
            <component :is="item.icon" class="h-6 w-6" />
            <span class="text-[15px]">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ol>
    </div>
  </BentoCard>
</template>

<script setup lang="ts">
import BentoCard from "@/components/bento/BentoCard.vue";
import {
  AboutIcon,
  BlogIcon,
  BookshelfIcon,
  HomeIcon,
  IconAnalytics,
  IconTooling,
  IconUser,
  ImportIcon,
  LoginIcon,
  LogoutIcon,
  MessageIcon,
  RegisterIcon,
  RssIcon,
} from "@/components/icons";
import { useAuthStore } from "@/stores/auth";
import { CreditCard, Image } from "lucide-vue-next";
import { Motion, type MotionProps } from "motion-v";
import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { DropdownItem } from "./components/UserDropdown.vue";
import UserDropdown from "./components/UserDropdown.vue";

const auth = useAuthStore();
const route = useRoute();

const props = defineProps<{
  layoutId?: string;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
}>();

// 用户菜单项配置（登录态）
const userMenuItems: DropdownItem[] = [
  { icon: IconUser, label: "Profile", to: "/settings" },
  { icon: ImportIcon, label: "Import", to: "/import" },
  { icon: MessageIcon, label: "Messages", to: "/messages", adminOnly: true },
  { icon: IconAnalytics, label: "Analytics", to: "/analytics", adminOnly: true },
  { divider: true },
  {
    icon: LogoutIcon,
    label: "Logout",
    class:
      "text-primary dark:text-primary rounded-xl font-bold hover:bg-primary rounded-full transition-colors duration-300 hover:text-white",
    onClick: () => auth.logout(),
  },
];

// 用户菜单项配置（未登录——访客）
const guestMenuItems: DropdownItem[] = [
  {
    icon: LoginIcon,
    label: "Login",
    class: "hover:bg-primary rounded-full transition-colors duration-300 hover:text-white",
    to: "/login",
  },
  {
    icon: RegisterIcon,
    label: "Register",
    class: "hover:bg-primary rounded-full transition-colors duration-300 hover:text-white",
    to: "/register",
  },
];

// 导航项配置
const navItems = [
  { path: "/", label: "首页", icon: HomeIcon },
  { path: "/blog", label: "近期文章", icon: BlogIcon },
  { path: "/bookshelf", label: "我的书架", icon: BookshelfIcon },
  { path: "/subscription", label: "订阅管理", icon: CreditCard },
  { path: "/gallery", label: "图片画廊", icon: Image },
  { path: "/rss", label: "RSS 订阅", icon: RssIcon },
  { path: "/toolbox/image-toolbox", label: "图片工具", icon: IconTooling },
  { path: "/about", label: "关于网站", icon: AboutIcon },
];

const hoverNavIndex = ref(0);

let navIndexTimer: ReturnType<typeof setTimeout> | null = null;

// 更新活动导航项索引
const updateNavIndex = () => {
  if (navIndexTimer) {
    clearTimeout(navIndexTimer);
  }
  const index = navItems.findIndex((item) => route.path === item.path);
  navIndexTimer = setTimeout(() => {
    if (index !== -1) {
      hoverNavIndex.value = index;
    }
  }, 100);
};

onUnmounted(() => {
  if (navIndexTimer) {
    clearTimeout(navIndexTimer);
  }
});

// 监听路由变化
watch(() => route.path, updateNavIndex, { immediate: true });
</script>
