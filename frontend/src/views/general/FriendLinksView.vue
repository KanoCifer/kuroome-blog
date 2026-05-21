<template>
  <BasicDetail title="友情链接" subtitle="与志同道合的朋友交换链接">
    <div class="col-span-full mx-auto w-full max-w-6xl">
      <!-- 每日推荐横幅 -->
      <div
        class="border-border bg-card/30 group mb-6 cursor-pointer overflow-hidden rounded-4xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-8"
        @click="$router.push('/websites')"
      >
        <Transition name="pick-switch" mode="out-in">
          <div
            :key="dailyPick?.id"
            class="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <img
                v-if="dailyPick?.icon"
                :src="dailyPick.icon"
                :alt="dailyPick?.name"
                class="h-8 w-8 object-contain"
                @error="handleImageError"
              />
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="text-muted-foreground h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center gap-2">
                <span class="text-muted-foreground text-xs font-bold tracking-wide uppercase">每日推荐</span>
                <span
                  class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold"
                >
                  {{ dailyPick?.category }}
                </span>
              </div>
              <h3 class="text-foreground text-lg font-bold">{{ dailyPick?.name }}</h3>
              <p class="text-muted-foreground mt-1 line-clamp-2 text-sm">{{ dailyPick?.description }}</p>
              <div v-if="dailyPick?.tags?.length" class="mt-3 flex flex-wrap gap-2">
                <TagPill
                  v-for="tag in dailyPick.tags.slice(0, 4)"
                  :key="tag"
                  compact
                >
                  {{ tag }}
                </TagPill>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-4">
              <button
                class="bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95"
                @click.stop="refreshDailyPick"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span class="hidden sm:inline">换一个</span>
              </button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="text-muted-foreground h-5 w-5 shrink-0 opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 非对称布局：左 2/3 + 右 1/3 -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- ======== 左列：本站信息 + 友链大卡片 ======== -->
        <div class="space-y-6 lg:col-span-2">
          <!-- 本站信息面板 -->
          <div class="border-primary/20 bg-primary/5 ring-primary/10 overflow-hidden rounded-4xl border p-8 ring-1">
            <div class="mb-6 flex items-start gap-5">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full">
                <img
                  :src="selfInfo.icon"
                  :alt="selfInfo.name"
                  class="h-16 w-16 rounded-full object-cover"
                  @error="handleImageError"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <h3 class="text-foreground text-2xl font-bold">
                    {{ selfInfo.name }}
                  </h3>
                  <span
                    class="bg-primary/15 text-primary inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  >
                    本站
                  </span>
                </div>
                <p class="text-muted-foreground mt-2 leading-relaxed">
                  {{ selfInfo.description }}
                </p>
              </div>

              <!-- 一键复制 -->
              <button
                class="group bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                @click="copySelfInfo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                <span
                  class="max-w-0 min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-500 ease-out group-hover:max-w-50 group-hover:opacity-100"
                  >复制</span
                >
              </button>
            </div>

            <!-- 信息行 -->
            <div class="bg-card/60 space-y-2 rounded-xl p-4">
              <div class="flex items-center gap-3 text-sm">
                <span class="text-muted-foreground w-16 shrink-0 font-medium">URL</span>
                <code class="text-foreground truncate">{{ selfInfo.url }}</code>
              </div>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-muted-foreground w-16 shrink-0 font-medium">Favicon</span>
                <code class="text-foreground truncate">{{ selfInfo.icon }}</code>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <TagPill
                  v-for="tag in selfInfo.tags"
                  :key="tag"
                  compact
                >
                  {{ tag }}
                </TagPill>
              </div>
            </div>
          </div>

          <!-- 友链大卡片 -->
          <motion.a
            v-for="link in links"
            :key="link.id"
            :initial="{ opacity: 0, y: 10 }"
            :whileInView="{ opacity: 1, y: 0 }"
            :transition="{
              type: 'spring',
              duration: 1,
              stiffness: 100,
              damping: 20,
            }"
            :whileHover="{ y: -4 }"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group border-border bg-card/30 hover:bg-primary block cursor-pointer overflow-hidden rounded-4xl border p-8 shadow-sm transition-all duration-300 hover:shadow-xl"
          >
            <div class="flex items-start gap-5">
              <div
                class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full opacity-100 transition-all duration-300 ease-out group-hover:w-0 group-hover:opacity-0"
              >
                <img
                  v-if="link.icon"
                  :src="link.icon"
                  :alt="link.name"
                  class="h-16 w-16 rounded-full object-cover"
                  @error="handleImageError"
                />
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-muted-foreground h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3
                  class="text-foreground group-hover:text-primary-foreground text-xl font-bold transition-colors duration-300"
                >
                  {{ link.name }}
                </h3>
                <p
                  class="text-muted-foreground group-hover:text-primary-foreground mt-2.5 leading-relaxed transition-colors duration-300"
                >
                  {{ link.description }}
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <TagPill
                    v-for="tag in link.tags"
                    :key="tag"
                  >
                    {{ tag }}
                  </TagPill>
                </div>
              </div>
            </div>

            <!-- 外链箭头 -->
            <div class="absolute top-6 right-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="text-muted-foreground h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </motion.a>

          <!-- 空状态 -->
          <div
            v-if="links.length === 0"
            class="border-border bg-card/30 flex flex-col items-center justify-center rounded-4xl border py-16"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="text-muted-foreground mb-4 h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p class="text-muted-foreground text-lg">暂无友链</p>
            <p class="text-muted-foreground mt-2 text-sm">欢迎提交申请，成为第一位友链伙伴</p>
          </div>
        </div>

        <!-- ======== 右列：申请须知 + GitHub Issue ======== -->
        <div class="space-y-6 lg:col-span-1">
          <div class="border-border bg-card/30 overflow-hidden rounded-4xl border p-8 shadow-sm">
            <!-- Header -->
            <div class="mb-6">
              <h3 class="text-foreground flex items-center gap-2 font-serif text-xl font-bold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-primary h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                申请友链
              </h3>
              <p class="text-muted-foreground mt-1.5 text-sm">
                通过 GitHub Issue 提交友链申请，审核通过后将在 48 小时内上线
              </p>
            </div>

            <!-- 接入须知 -->
            <div class="border-primary/15 bg-primary/5 mb-6 rounded-2xl border p-5">
              <h4 class="text-foreground mb-3 flex items-center gap-2 text-sm font-bold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-primary h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                接入须知
              </h4>
              <ul class="text-muted-foreground space-y-2 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-0.5 shrink-0 text-xs">●</span>
                  <span>网站需符合中国大陆相关法律法规</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-0.5 shrink-0 text-xs">●</span>
                  <span>网站内容原创、非商业推广</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-0.5 shrink-0 text-xs">●</span>
                  <span
                    >已在您的网站添加本站友链（<a
                      href="https://kanocifer.chat"
                      target="_blank"
                      class="text-primary underline"
                      >kanocifer.chat</a
                    >）</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-0.5 shrink-0 text-xs">●</span>
                  <span>网站可正常访问</span>
                </li>
              </ul>
            </div>

            <!-- 申请格式 -->
            <div class="mb-6">
              <h4 class="text-foreground mb-3 flex items-center gap-2 text-sm font-bold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-primary h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                申请格式
              </h4>
              <pre class="bg-muted text-muted-foreground overflow-x-auto rounded-xl p-4 text-xs leading-relaxed">
- **站点名称**：
- **描述**：
- **URL**：
- **头像**：
- **标签**：</pre
              >
            </div>

            <!-- CTA -->
            <a
              href="https://github.com/KanoCifer/kuroome-blog/issues/1"
              target="_blank"
              rel="noopener noreferrer"
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              前往 GitHub Issue 提交申请
            </a>
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import friendLinksData from "@/data/friendlinks.json";
import websitesData from "@/data/websites.json";
import { useNotificationStore } from "@/stores/notification";
import type { Website } from "@/types";
import { TagPill } from "@/components/ui/tag-pill";
import { useImageError } from "@/composables/useImageError";
import { motion } from "motion-v";
import { onMounted, ref } from "vue";

interface FriendLink {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
}

interface SelfInfo {
  name: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
}

const dailyPick = ref<Website | null>(null);
const links = ref<FriendLink[]>([]);
const selfInfo = ref<SelfInfo>({
  name: "",
  description: "",
  url: "",
  icon: "",
  tags: [],
});

const refreshDailyPick = () => {
  if (websitesData.sites.length === 0) return;
  if (websitesData.sites.length === 1) {
    dailyPick.value = websitesData.sites[0] as Website;
    return;
  }
  let idx: number;
  do {
    idx = Math.floor(Math.random() * websitesData.sites.length);
  } while (websitesData.sites[idx].id === dailyPick.value?.id);
  dailyPick.value = websitesData.sites[idx] as Website;
};

onMounted(() => {
  links.value = friendLinksData.links;
  selfInfo.value = friendLinksData.self as SelfInfo;
  refreshDailyPick();
});

const { handleImageError } = useImageError();

const copySelfInfo = async () => {
  const md = [
    `- **站点名称**：${selfInfo.value.name}`,
    `- **描述**：${selfInfo.value.description}`,
    `- **URL**：${selfInfo.value.url}`,
    `- **头像**：${selfInfo.value.icon}`,
  ].join("\n");

  const notice = useNotificationStore();
  try {
    await navigator.clipboard.writeText(md);
    notice.success("友链信息已复制到剪贴板");
  } catch {
    notice.error("复制失败，请手动复制");
  }
};
</script>

<style scoped>
.pick-switch-enter-active,
.pick-switch-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.pick-switch-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.pick-switch-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
