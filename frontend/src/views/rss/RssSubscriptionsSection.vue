<template>
  <section
    id="rss-subscriptions"
    class="border-border bg-card rounded-2xl border p-6"
  >
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-primary text-xl font-bold">我的订阅</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          共 {{ subscriptions.length }} 个订阅源
        </p>
      </div>
      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :disabled="subscriptionsLoading"
        @click="$emit('refreshList')"
      >
        {{ subscriptionsLoading ? "刷新中..." : "刷新订阅列表" }}
      </button>
    </div>

    <div
      v-if="subscriptionsError"
      class="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm"
    >
      {{ subscriptionsError }}
    </div>

    <div v-else-if="subscriptionsLoading" class="space-y-3">
      <div
        v-for="skeleton in 3"
        :key="skeleton"
        class="border-border bg-muted/40 h-24 animate-pulse rounded-xl border"
      />
    </div>

    <div
      v-else-if="subscriptions.length === 0"
      class="border-border bg-muted/40 text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm"
    >
      暂无订阅，先在上方解析并保存一个 RSS 地址吧。
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="subscription in subscriptions"
        :key="subscription.id"
        class="rounded-xl border p-4 transition-all"
        :class="
          activeSubscriptionId === subscription.id
            ? 'border-primary/30 bg-primary/5'
            : 'border-border bg-card hover:border-border/70'
        "
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-primary truncate text-base font-semibold">
                {{ getSubscriptionTitle(subscription) }}
              </h3>
              <span
                class="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {{ getFeedProtocol(subscription.rssUrl) }}
              </span>
            </div>
            <p class="text-muted-foreground mt-1 text-xs break-all">
              {{ subscription.rssUrl }}
            </p>
            <div
              class="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs"
            >
              <span>文章数: {{ subscription.entryCount ?? 0 }}</span>
              <span
                >最近抓取: {{ formatDate(subscription.lastFetchedAt) }}</span
              >
              <span>创建时间: {{ formatDate(subscription.createdAt) }}</span>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              @click="$emit('filterByFeed', subscription)"
            >
              查看文章
            </button>
            <button
              type="button"
              class="bg-success text-success-foreground hover:bg-success/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              @click="$emit('refresh', subscription)"
            >
              刷新文章
            </button>
            <button
              type="button"
              class="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              @click="$emit('delete', subscription)"
            >
              删除订阅
            </button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { getSubscriptionTitle, getFeedProtocol } from "./rssUtils";
import { formatDate } from "@/utils/formatdate";
import type { SubscriptionItem } from "@/service/rssService";

defineProps<{
  subscriptions: SubscriptionItem[];
  subscriptionsLoading: boolean;
  subscriptionsError: string;
  activeSubscriptionId: number | null;
}>();

defineEmits<{
  refresh: [subscription: SubscriptionItem];
  delete: [subscription: SubscriptionItem];
  filterByFeed: [subscription: SubscriptionItem];
  refreshList: [];
}>();
</script>
