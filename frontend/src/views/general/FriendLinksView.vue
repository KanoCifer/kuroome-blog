<template>
  <BasicDetail title="友情链接" subtitle="与志同道合的朋友交换链接">
    <div class="col-span-full mx-auto w-full max-w-6xl">
      <!-- 每日推荐横幅 -->
      <div
        class="border-border bg-card/30 group relative mb-6 cursor-pointer overflow-hidden rounded-4xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-8"
        @click="$router.push('/websites')"
      >
        <Transition name="pick-switch" mode="out-in">
          <div :key="dailyPick?.id" class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
              <img
                v-if="dailyPick?.icon"
                :src="dailyPick.icon"
                :alt="dailyPick?.name"
                class="h-8 w-8 object-contain"
                @error="handleImageError"
              />
              <IconGlobeOutline v-else class="text-muted-foreground h-7 w-7" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center gap-2">
                <span class="text-muted-foreground text-xs font-bold tracking-wide uppercase">每日推荐</span>
                <span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {{ dailyPick?.category }}
                </span>
              </div>
              <h3 class="text-foreground text-lg font-bold">{{ dailyPick?.name }}</h3>
              <p class="text-muted-foreground mt-1 line-clamp-2 text-sm">{{ dailyPick?.description }}</p>
              <div v-if="dailyPick?.tags?.length" class="mt-3 flex flex-wrap gap-2">
                <TagPill v-for="tag in dailyPick.tags.slice(0, 4)" :key="tag" compact>
                  {{ tag }}
                </TagPill>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-4">
              <button
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                @click.stop="$router.push('/websites')"
              >
                <IconExternalLink class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">看更多</span>
              </button>
              <button
                class="bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95"
                @click.stop="refreshDailyPick"
              >
                <IconRefresh class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">换一个</span>
              </button>
            </div>
          </div>
        </Transition>
        <IconExternalLink
          class="text-muted-foreground absolute top-4 right-4 h-5 w-5 shrink-0 opacity-40 transition-opacity duration-300 group-hover:opacity-100"
        />
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
                <IconCopy class="h-4 w-4" />
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
                <TagPill v-for="tag in selfInfo.tags" :key="tag" compact>
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
                <IconGlobeOutline v-else class="text-muted-foreground h-10 w-10" />
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
                  <TagPill v-for="tag in link.tags" :key="tag">
                    {{ tag }}
                  </TagPill>
                </div>
              </div>
            </div>

            <!-- 外链箭头 -->
            <div class="absolute top-6 right-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <IconExternalLink class="text-muted-foreground h-5 w-5" />
            </div>
          </motion.a>

          <!-- 空状态 -->
          <div
            v-if="links.length === 0"
            class="border-border bg-card/30 flex flex-col items-center justify-center rounded-4xl border py-16"
          >
            <IconUsersGroup class="text-muted-foreground mb-4 h-16 w-16" />
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
                <IconLinkChain class="text-primary h-5 w-5" />
                申请友链
              </h3>
              <p class="text-muted-foreground mt-1.5 text-sm">
                通过 GitHub Issue 提交友链申请，审核通过后将在 48 小时内上线
              </p>
            </div>

            <!-- 接入须知 -->
            <div class="border-primary/15 bg-primary/5 mb-6 rounded-2xl border p-5">
              <h4 class="text-foreground mb-3 flex items-center gap-2 text-sm font-bold">
                <IconInfoCircle class="text-primary h-4 w-4" />
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
                <IconDocumentText class="text-primary h-4 w-4" />
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
              <IconExternalLink class="h-4 w-4" />
              前往 GitHub Issue 提交申请
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 评论区 -->
    <div class="col-span-full mx-auto w-full max-w-6xl">
      <div class="border-border bg-card overflow-hidden rounded-4xl border shadow-sm">
        <div class="border-border border-b px-8 py-5">
          <h3 class="text-foreground text-lg font-semibold">评论</h3>
        </div>
        <div class="p-8">
          <div id="tcomment" />
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import { BasicDetail } from "@/components/basic";
import { TagPill } from "@/components/ui/tag-pill";
import { useImageError } from "@/composables/useImageError";
import friendLinksData from "@/data/friendlinks.json";
import websitesData from "@/data/websites.json";
import { useNotificationStore } from "@/stores/notification";
import type { Website } from "@/types";
import { motion } from "motion-v";
import { nextTick, onMounted, ref } from "vue";
import twikoo from "twikoo";
import IconCopy from "./icon/IconCopy.vue";
import IconDocumentText from "./icon/IconDocumentText.vue";
import IconExternalLink from "./icon/IconExternalLink.vue";
import IconGlobeOutline from "./icon/IconGlobeOutline.vue";
import IconInfoCircle from "./icon/IconInfoCircle.vue";
import IconLinkChain from "./icon/IconLinkChain.vue";
import IconRefresh from "./icon/IconRefresh.vue";
import IconUsersGroup from "./icon/IconUsersGroup.vue";

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

onMounted(async () => {
  links.value = friendLinksData.links;
  selfInfo.value = friendLinksData.self as SelfInfo;
  refreshDailyPick();

  await nextTick();
  twikoo.init({
    envId: "https://kanocifer.chat/twikoo",
    el: "#tcomment",
    path: "/friend-links",
    lang: "zh-CN",
  });
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
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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

<style>
@import "twikoo/dist/twikoo.css";

#tcomment {
  font-size: 0.9375rem;
}

#tcomment .el-input__inner,
#tcomment .el-textarea__inner {
  background: var(--card-bg);
  border-color: var(--warm-gray);
  border-radius: 0.75rem;
  color: var(--ink);
  font-size: 0.9375rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
#tcomment .el-input__inner:focus,
#tcomment .el-textarea__inner:focus {
  border-color: var(--workspace-accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--workspace-accent) 15%, transparent);
}
#tcomment .el-textarea__inner {
  line-height: 1.7;
  padding: 0.75rem 1rem;
}

#tcomment .el-button {
  border-radius: 0.75rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s;
  padding: 0.5rem 1.25rem;
}

#tcomment .el-button--primary {
  background: var(--workspace-accent);
  border-color: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
}
#tcomment .el-button--primary:hover {
  opacity: 0.88;
  background: var(--workspace-accent);
  border-color: var(--workspace-accent);
}
#tcomment .el-button--primary:active {
  opacity: 0.78;
}

#tcomment .el-button--default,
#tcomment .el-button:not(.el-button--primary):not(.el-button--danger):not(.el-button--text) {
  background: var(--card-bg);
  border-color: var(--warm-gray);
  color: var(--ink);
}
#tcomment .el-button--default:hover,
#tcomment .el-button:not(.el-button--primary):not(.el-button--danger):not(.el-button--text):hover {
  border-color: var(--workspace-accent);
  color: var(--workspace-accent);
  background: color-mix(in oklch, var(--workspace-accent) 8%, var(--card-bg));
}

#tcomment .el-button--text {
  color: var(--muted);
  padding: 0.25rem 0.5rem;
}
#tcomment .el-button--text:hover {
  color: var(--workspace-accent);
  background: transparent;
}

#tcomment .tk-comment {
  border-bottom: 1px solid var(--warm-gray);
  padding: 1.25rem 0;
}
#tcomment .tk-comment:last-child {
  border-bottom: none;
}

#tcomment .tk-avatar {
  border-radius: 9999px;
  overflow: hidden;
}

#tcomment .tk-nick {
  color: var(--ink);
  font-weight: 600;
}

#tcomment .tk-time {
  color: var(--muted);
  font-size: 0.8125rem;
}

#tcomment .tk-content {
  color: var(--ink);
  line-height: 1.75;
}

#tcomment .tk-replies {
  border-left: 2px solid var(--warm-gray);
  margin-left: 1.5rem;
  padding-left: 1rem;
}

#tcomment .el-pager li {
  border-radius: 0.5rem;
  font-weight: 500;
}
#tcomment .el-pager li.active {
  background: var(--workspace-accent);
  color: var(--workspace-accent-contrast);
}

#tcomment .OwO {
  color: var(--ink);
}
#tcomment .OwO .OwO-logo {
  border-radius: 0.5rem;
}

.dark #tcomment .el-input__inner,
.dark #tcomment .el-textarea__inner {
  background: color-mix(in oklch, var(--card-bg) 60%, var(--paper));
}
</style>
