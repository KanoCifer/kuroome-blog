<template>
  <div class="bg-background flex min-h-[calc(100dvh-4rem)] flex-col">
    <!-- Hero Image Section -->
    <div class="relative h-[30vh] flex-shrink-0 overflow-hidden md:h-[35vh]">
      <img src="/card/card-1.jpeg" alt="" class="h-full w-full object-cover" />
      <div
        class="from-background/40 via-background/5 to-background pointer-events-none absolute inset-0 bg-gradient-to-b"
      />

      <!-- Back Button -->
      <div
        class="absolute top-0 right-0 left-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          @click="handleBack"
          aria-label="返回"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="text-foreground h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
      </div>

      <!-- Refresh Button -->
      <div
        class="absolute top-0 right-0 z-10 flex items-center px-4 py-4 md:px-6"
      >
        <button
          type="button"
          class="border-border bg-card/60 hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors"
          :class="{ 'animate-spin': statsStore.isLoading }"
          @click="handleRefresh"
          aria-label="刷新统计"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="text-foreground h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
        </button>
      </div>

      <!-- Title Overlay -->
      <div
        class="absolute right-0 bottom-0 left-0 z-10 px-6 pb-6 md:px-10 md:pb-8"
      >
        <h1
          class="font-serif text-3xl font-bold text-white drop-shadow-lg md:text-5xl"
        >
          阅读统计
        </h1>
        <div class="mt-2 flex items-center gap-3">
          <span class="text-sm text-white/75 md:text-base">微信读书</span>
          <span class="h-1 w-1 rounded-full bg-white/40" />
          <span class="text-sm text-white/75 md:text-base">
            {{ activeModeLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Stats Content -->
    <div class="flex-1 pb-8">
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10">
        <!-- Loading skeleton -->
        <div v-if="statsStore.isLoading && !activeSnapshot" class="space-y-6">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div v-for="i in 4" :key="i" class="animate-pulse">
              <div class="bg-muted h-24 rounded-xl" />
            </div>
          </div>
          <div class="bg-muted h-80 animate-pulse rounded-xl" />
        </div>

        <!-- Error state -->
        <div
          v-else-if="statsStore.error"
          class="flex flex-col items-center justify-center py-20"
        >
          <p class="text-destructive mb-4 text-center text-sm">
            {{ statsStore.error }}
          </p>
          <button
            type="button"
            class="bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            @click="statsStore.fetchStats()"
          >
            重试
          </button>
        </div>

        <template v-else-if="activeSnapshot">
          <!-- Mode Tabs -->
          <div class="bg-card mb-3 flex gap-1 rounded-xl p-1">
            <button
              v-for="mode in modes"
              :key="mode.key"
              type="button"
              class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              :class="
                activeMode === mode.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              "
              @click="activeMode = mode.key"
            >
              {{ mode.label }}
            </button>
          </div>

          <!-- Refresh action row -->
          <div
            class="text-muted-foreground mb-6 flex items-center justify-between text-xs"
          >
            <span class="tabular-nums">
              <template v-if="lastRefreshedAt">
                数据更新于 {{ lastRefreshedAt.format('HH:mm') }}
              </template>
              <template v-else>—</template>
            </span>
            <button
              type="button"
              class="border-border text-foreground hover:bg-accent hover:text-accent-foreground bg-card inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="statsStore.isLoading"
              @click="handleRefresh"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-3.5 w-3.5"
                :class="{ 'animate-spin': statsStore.isLoading }"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
              刷新数据
            </button>
          </div>

          <!-- Summary Metrics -->
          <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div
              v-for="metric in summaryMetrics"
              :key="metric.key"
              class="group bg-card hover:border-primary/40 relative overflow-hidden rounded-xl border p-4 transition-colors"
            >
              <div
                class="absolute top-0 right-0 h-16 w-16 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.12]"
                :class="metric.bgClass"
              />
              <p class="text-muted-foreground mb-1 text-xs">
                {{ metric.label }}
              </p>
              <p
                class="text-foreground relative text-2xl font-bold tabular-nums"
              >
                {{ metric.value }}
                <span
                  v-if="metric.unit"
                  class="text-muted-foreground text-sm font-normal"
                >
                  {{ metric.unit }}
                </span>
              </p>
            </div>
          </div>

          <!-- Section: 阅读行为 -->
          <div class="mb-8 space-y-6">
            <h2
              class="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase"
            >
              <span class="bg-border h-px flex-1" />
              阅读行为
              <span class="bg-border h-px flex-1" />
            </h2>

            <!-- Trend Chart -->
            <div
              v-if="activeSnapshot.readTimes"
              class="bg-card relative overflow-hidden rounded-xl border shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <div
                class="bg-primary/60 absolute top-0 right-0 left-0 h-[2px]"
              />
              <div class="p-4 sm:p-6">
                <header class="mb-4 flex items-start gap-3">
                  <div
                    class="bg-primary/10 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.8"
                      stroke="currentColor"
                      class="h-5 w-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                      />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-foreground text-base font-semibold">
                      阅读趋势
                    </h3>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                      每日阅读时长变化
                    </p>
                  </div>
                </header>
                <div class="h-64 sm:h-80">
                  <v-chart :option="trendOption" autoresize />
                </div>
              </div>
            </div>

            <!-- Read/Listen Ratio -->
            <div
              v-if="hasReadListenData"
              class="bg-card relative overflow-hidden rounded-xl border"
            >
              <div
                class="bg-success/60 absolute top-0 right-0 left-0 h-[2px]"
              />
              <div class="p-4 sm:p-6">
                <header class="mb-4 flex items-start gap-3">
                  <div
                    class="bg-success/10 text-success flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.8"
                      stroke="currentColor"
                      class="h-5 w-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-foreground text-base font-semibold">
                      阅读方式
                    </h3>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                      文字阅读 vs 听书 时长占比
                    </p>
                  </div>
                </header>
                <div class="space-y-4">
                  <div>
                    <div class="mb-2 flex items-center justify-between">
                      <span
                        class="text-foreground flex items-center gap-2 text-sm"
                      >
                        <span
                          class="bg-primary inline-block h-2 w-2 rounded-full"
                        />
                        文字阅读
                      </span>
                      <span
                        class="text-foreground text-sm font-medium tabular-nums"
                      >
                        {{ formatDuration(activeSnapshot.wrReadTime) }}
                        <span class="text-muted-foreground text-xs">
                          · {{ readPercent }}%
                        </span>
                      </span>
                    </div>
                    <div class="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        class="bg-primary h-full rounded-full transition-all duration-500"
                        :style="{ width: `${readPercent}%` }"
                      />
                    </div>
                  </div>
                  <div>
                    <div class="mb-2 flex items-center justify-between">
                      <span
                        class="text-foreground flex items-center gap-2 text-sm"
                      >
                        <span
                          class="bg-success inline-block h-2 w-2 rounded-full"
                        />
                        听书
                      </span>
                      <span
                        class="text-foreground text-sm font-medium tabular-nums"
                      >
                        {{ formatDuration(activeSnapshot.wrListenTime) }}
                        <span class="text-muted-foreground text-xs">
                          · {{ listenPercent }}%
                        </span>
                      </span>
                    </div>
                    <div class="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        class="bg-success h-full rounded-full transition-all duration-500"
                        :style="{ width: `${listenPercent}%` }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 阅读偏好 -->
          <div class="mb-8 space-y-6">
            <h2
              class="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase"
            >
              <span class="bg-border h-px flex-1" />
              阅读偏好
              <span class="bg-border h-px flex-1" />
            </h2>

            <!-- Two-column: Category + Time Distribution -->
            <div class="grid gap-6 lg:grid-cols-2">
              <!-- Prefer Category -->
              <div
                v-if="
                  activeSnapshot.preferCategory &&
                  activeSnapshot.preferCategory.length > 0
                "
                class="bg-card relative overflow-hidden rounded-xl border"
              >
                <div
                  class="bg-warning/60 absolute top-0 right-0 left-0 h-[2px]"
                />
                <div class="p-4 sm:p-6">
                  <header class="mb-4 flex items-start gap-3">
                    <div
                      class="bg-warning/10 text-warning flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.8"
                        stroke="currentColor"
                        class="h-5 w-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 6h.008v.008H6V6Z"
                        />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-foreground text-base font-semibold">
                        分类偏好
                      </h3>
                      <p class="text-muted-foreground mt-0.5 text-xs">
                        各品类阅读时长占比
                      </p>
                    </div>
                  </header>
                  <div class="h-64 sm:h-72">
                    <v-chart :option="categoryOption" autoresize />
                  </div>
                </div>
              </div>

              <!-- Prefer Time -->
              <div
                v-if="activeSnapshot.preferTime"
                class="bg-card relative overflow-hidden rounded-xl border"
              >
                <div
                  class="bg-primary/60 absolute top-0 right-0 left-0 h-[2px]"
                />
                <div class="p-4 sm:p-6">
                  <header class="mb-4 flex items-start gap-3">
                    <div
                      class="bg-primary/10 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.8"
                        stroke="currentColor"
                        class="h-5 w-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-foreground text-base font-semibold">
                        时段分布
                      </h3>
                      <p class="text-muted-foreground mt-0.5 text-xs">
                        一天中各时段的阅读频率
                      </p>
                    </div>
                  </header>
                  <div class="h-64 sm:h-72">
                    <v-chart :option="preferTimeOption" autoresize />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: 阅读排行 -->
          <div class="mb-8 space-y-6">
            <h2
              class="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase"
            >
              <span class="bg-border h-px flex-1" />
              阅读排行
              <span class="bg-border h-px flex-1" />
            </h2>

            <!-- Read Longest Chart -->
            <div
              v-if="
                activeSnapshot.readLongest &&
                activeSnapshot.readLongest.length > 0
              "
              class="bg-card relative overflow-hidden rounded-xl border"
            >
              <div
                class="bg-warning/60 absolute top-0 right-0 left-0 h-[2px]"
              />
              <div class="p-4 sm:p-6">
                <header class="mb-4 flex items-start gap-3">
                  <div
                    class="bg-warning/10 text-warning flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.8"
                      stroke="currentColor"
                      class="h-5 w-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-4.5A3.375 3.375 0 0 0 18.375 11.25H5.625A3.375 3.375 0 0 0 3 14.625V18.75m9-11.25h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                      />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-foreground text-base font-semibold">
                      阅读排行
                    </h3>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                      单本阅读时长 Top 10
                    </p>
                  </div>
                </header>
                <div class="h-64 sm:h-80">
                  <v-chart :option="longestOption" autoresize />
                </div>
              </div>
            </div>

            <!-- Two-column: Author + Publisher -->
            <div class="grid gap-6 lg:grid-cols-2">
              <!-- Prefer Authors -->
              <div
                v-if="
                  activeSnapshot.preferAuthor &&
                  activeSnapshot.preferAuthor.length > 0
                "
                class="bg-card relative overflow-hidden rounded-xl border"
              >
                <div
                  class="bg-primary/60 absolute top-0 right-0 left-0 h-[2px]"
                />
                <div class="p-4 sm:p-6">
                  <header class="mb-4 flex items-start gap-3">
                    <div
                      class="bg-primary/10 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.8"
                        stroke="currentColor"
                        class="h-5 w-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                        />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-foreground text-base font-semibold">
                        偏好作者
                      </h3>
                      <p class="text-muted-foreground mt-0.5 text-xs">
                        阅读时长最多的作者
                      </p>
                    </div>
                  </header>
                  <div class="space-y-2.5">
                    <div
                      v-for="(
                        author, index
                      ) in activeSnapshot.preferAuthor.slice(0, 5)"
                      :key="author.authorId ?? index"
                      class="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <span
                          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                          :class="rankBadgeClass(index)"
                        >
                          {{ index + 1 }}
                        </span>
                        <span
                          class="text-foreground truncate text-sm font-medium"
                        >
                          {{ author.name ?? '未知作者' }}
                        </span>
                      </div>
                      <span
                        class="text-muted-foreground flex-shrink-0 text-sm tabular-nums"
                      >
                        {{ author.readingTime ?? '--' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Prefer Publishers -->
              <div
                v-if="
                  activeSnapshot.preferPublisher &&
                  activeSnapshot.preferPublisher.length > 0
                "
                class="bg-card relative overflow-hidden rounded-xl border"
              >
                <div
                  class="bg-success/60 absolute top-0 right-0 left-0 h-[2px]"
                />
                <div class="p-4 sm:p-6">
                  <header class="mb-4 flex items-start gap-3">
                    <div
                      class="bg-success/10 text-success flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.8"
                        stroke="currentColor"
                        class="h-5 w-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"
                        />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-foreground text-base font-semibold">
                        偏好出版社
                      </h3>
                      <p class="text-muted-foreground mt-0.5 text-xs">
                        阅读册数最多的出版社
                      </p>
                    </div>
                  </header>
                  <div class="space-y-2.5">
                    <div
                      v-for="(
                        pub, index
                      ) in activeSnapshot.preferPublisher.slice(0, 5)"
                      :key="pub.name ?? index"
                      class="hover:bg-accent/50 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <span
                          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                          :class="rankBadgeClass(index)"
                        >
                          {{ index + 1 }}
                        </span>
                        <span
                          class="text-foreground truncate text-sm font-medium"
                        >
                          {{ pub.name ?? '未知出版社' }}
                        </span>
                      </div>
                      <span
                        class="text-muted-foreground flex-shrink-0 text-sm tabular-nums"
                      >
                        {{ pub.count }} 本
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Read Stat Summary -->
          <div
            v-if="activeSnapshot.readStat && activeSnapshot.readStat.length > 0"
            class="bg-card relative overflow-hidden rounded-xl border"
          >
            <div class="bg-warning/60 absolute top-0 right-0 left-0 h-[2px]" />
            <div class="p-4 sm:p-6">
              <header class="mb-4 flex items-start gap-3">
                <div
                  class="bg-warning/10 text-warning flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.8"
                    stroke="currentColor"
                    class="h-5 w-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-foreground text-base font-semibold">
                    阅读概览
                  </h3>
                  <p class="text-muted-foreground mt-0.5 text-xs">
                    累计数据概览
                  </p>
                </div>
              </header>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div
                  v-for="stat in activeSnapshot.readStat"
                  :key="stat.label"
                  class="bg-muted/40 hover:bg-muted/60 rounded-lg p-3 text-center transition-colors"
                >
                  <p
                    class="text-foreground text-xl font-bold tabular-nums sm:text-2xl"
                  >
                    {{ stat.value }}
                  </p>
                  <p class="text-muted-foreground mt-1 text-xs">
                    {{ stat.label }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReadStatsStore } from '@/stores/readStats';
import dayjs from 'dayjs';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import VChart from 'vue-echarts';

const router = useRouter();
const statsStore = useReadStatsStore();

const modes = [
  { key: 'weekly', label: '本周' },
  { key: 'monthly', label: '本月' },
  { key: 'annually', label: '本年' },
  { key: 'overall', label: '累计' },
] as const;

type ModeKey = (typeof modes)[number]['key'];

const activeMode = ref<ModeKey>('weekly');

const activeModeLabel = computed(
  () => modes.find((m) => m.key === activeMode.value)?.label ?? '',
);

const activeSnapshot = computed(
  () => statsStore.snapshotByMode[activeMode.value] ?? null,
);

// Dark mode detection
const isDark = ref(document.documentElement.classList.contains('dark'));
let observer: MutationObserver | null = null;

onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});
onUnmounted(() => observer?.disconnect());

// Colors — ECharts CanvasGradient requires hex/rgb, not oklch
const textColor = computed(() => (isDark.value ? '#e5e7eb' : '#1f2937'));
const subtextColor = computed(() => (isDark.value ? '#9ca3af' : '#6b7280'));
const axisColor = computed(() => (isDark.value ? '#4b5563' : '#d1d5db'));
const splitLineColor = computed(() => (isDark.value ? '#374151' : '#f3f4f6'));

const primaryColor = computed(() => (isDark.value ? '#60a5fa' : '#3b82f6'));
const primaryRgba = computed(() =>
  isDark.value ? 'rgba(96,165,250,' : 'rgba(59,130,246,',
);

const PALETTE = [
  '#3b82f6',
  '#34d399',
  '#f97316',
  '#06b6d4',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#8b5cf6',
];

// ── Helpers ──

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Read/Listen ratio
const hasReadListenData = computed(() => {
  const s = activeSnapshot.value;
  return s && ((s.wrReadTime ?? 0) > 0 || (s.wrListenTime ?? 0) > 0);
});

const readPercent = computed(() => {
  const s = activeSnapshot.value;
  if (!s) return 0;
  const read = s.wrReadTime ?? 0;
  const listen = s.wrListenTime ?? 0;
  const total = read + listen;
  if (total === 0) return 0;
  return Math.round((read / total) * 100);
});

const listenPercent = computed(() => 100 - readPercent.value);

function formatCompare(val: number | null): string {
  if (val == null) return '--';
  const pct = (val * 100).toFixed(1);
  return val >= 0 ? `+${pct}%` : `${pct}%`;
}

function formatTimestamp(ts: string): string {
  const d = dayjs.unix(Number(ts));
  if (!d.isValid()) return ts;
  return d.format('MM/DD');
}

// Rank badge color — top-3 stand out, the rest fade
function rankBadgeClass(index: number): string {
  if (index === 0) return 'bg-primary text-primary-foreground';
  if (index === 1) return 'bg-primary/70 text-primary-foreground';
  if (index === 2) return 'bg-primary/40 text-foreground';
  return 'bg-muted text-muted-foreground';
}

// Summary metrics — used in the top metrics row
const summaryMetrics = computed<
  Array<{
    key: string;
    label: string;
    value: string;
    unit?: string;
    bgClass: string;
  }>
>(() => {
  const s = activeSnapshot.value;
  if (!s) return [];
  const compare = s.compare ?? 0;
  return [
    {
      key: 'total',
      label: '总阅读时长',
      value: formatDuration(s.totalReadTime),
      bgClass: 'bg-primary',
    },
    {
      key: 'days',
      label: '阅读天数',
      value: String(s.readDays ?? 0),
      unit: '天',
      bgClass: 'bg-success',
    },
    {
      key: 'avg',
      label: '日均时长',
      value: formatDuration(s.dayAverageReadTime),
      bgClass: 'bg-warning',
    },
    {
      key: 'compare',
      label: '环比变化',
      value: formatCompare(compare),
      bgClass: compare >= 0 ? 'bg-success' : 'bg-destructive',
    },
  ];
});

// ── Trend chart ──

const trendOption = computed(() => {
  const readTimes = activeSnapshot.value?.readTimes;
  if (!readTimes) return {};
  const entries = Object.entries(readTimes).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) => {
        return (
          params[0].name + '：' + Math.round(params[0].value / 60) + ' 分钟'
        );
      },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: entries.map(([k]) => formatTimestamp(k)),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: { color: subtextColor.value },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: subtextColor.value },
      axisLabel: {
        color: subtextColor.value,
        formatter: (v: number) => `${Math.round(v / 60)}`,
      },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        type: 'line',
        data: entries.map(([, v]) => v),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: primaryColor.value, width: 2 },
        itemStyle: { color: primaryColor.value },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: primaryRgba.value + '0.25)' },
              { offset: 1, color: primaryRgba.value + '0.02)' },
            ],
          },
        },
      },
    ],
  };
});

// ── Read longest chart ──

const longestOption = computed(() => {
  const items = activeSnapshot.value?.readLongest ?? [];
  if (!items.length) return {};
  const sorted = [...items].sort((a, b) => a.readTime - b.readTime).slice(-10);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>${formatDuration(p.value)}`;
      },
    },
    grid: { left: 120, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { color: subtextColor.value },
      axisLabel: {
        color: subtextColor.value,
        formatter: (v: number) => `${Math.round(v / 60)}`,
      },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((i) => i.title ?? ''),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: {
        color: textColor.value,
        width: 100,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((i) => i.readTime),
        barMaxWidth: 24,
        itemStyle: {
          color: primaryColor.value,
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],
  };
});

// ── Category chart ──

const categoryOption = computed(() => {
  const cats = activeSnapshot.value?.preferCategory ?? [];
  if (!cats.length) return {};
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${formatDuration(p.value)} (${p.percent}%)`,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: cats.map((c, i) => ({
          name: c.categoryTitle,
          value: c.readingTime,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
        label: {
          color: textColor.value,
          fontSize: 12,
          formatter: '{b}\n{d}%',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
        },
      },
    ],
  };
});

// ── Prefer time chart ──

const preferTimeOption = computed(() => {
  const times = activeSnapshot.value?.preferTime;
  if (!times || !times.length) return {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: times.map((_, i) => `${String(i).padStart(2, '0')}:00`),
      axisLine: { lineStyle: { color: axisColor.value } },
      axisLabel: {
        color: subtextColor.value,
        interval: 3,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: subtextColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        type: 'bar',
        data: times,
        barMaxWidth: 16,
        itemStyle: {
          color: primaryColor.value,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

// ── Actions ──

function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/bookshelf');
  }
}

function handleRefresh() {
  statsStore.fetchStats(true);
  lastRefreshedAt.value = dayjs();
}

onMounted(() => {
  if (!statsStore.snapshots.length) {
    statsStore.fetchStats();
  }
});

const lastRefreshedAt = ref<dayjs.Dayjs | null>(null);

// Track when data last arrived — covers both initial load and refresh.
watch(
  () => statsStore.snapshots,
  (val) => {
    if (val.length) lastRefreshedAt.value = dayjs();
  },
  { immediate: true },
);

// Reset tab when data changes
watch(
  () => statsStore.snapshotByMode,
  (byMode) => {
    if (!byMode[activeMode.value] && Object.keys(byMode).length) {
      activeMode.value = Object.keys(byMode)[0] as ModeKey;
    }
  },
);
</script>
