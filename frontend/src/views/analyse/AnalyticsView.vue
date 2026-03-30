<template>
  <div>
    <!-- Title Section with Parallax -->
    <div class="relative z-10 mx-0 mt-60 flex flex-col items-center justify-center bg-transparent" :style="titleStyle">
      <div>
        <h1 class="max-w-6xl text-center font-serif text-7xl text-gray-50 max-sm:text-3xl">Analytics Dashboard</h1>
        <!-- Admin Badge and Description -->
        <div class="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
          <span
            class="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            Admin Only
          </span>
          <span class="text-gray-200">Monitor your website performance</span>
        </div>
      </div>
    </div>

    <div class="relative mt-36">
      <div
        :style="sectionStyle"
        class="absolute left-1/2 -z-5 h-full -translate-x-1/2 rounded-t-[40px] bg-blue-50 dark:bg-slate-900"
      ></div>

      <div class="mx-auto max-w-6xl space-y-6 pt-24 pb-12">
        <!-- Action Bar -->
        <div
          class="squircle relative z-10 flex flex-col items-center justify-between gap-4 border border-gray-200/60 bg-white/80 p-4 shadow-sm sm:flex-row dark:border-gray-800 dark:bg-gray-900/70"
        >
          <!-- Days Filter -->
          <div class="relative">
            <button
              class="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="showDropdown = !showDropdown"
              @mouseenter="handleMouseIn"
              @mouseleave="handleMouseOut"
            >
              <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Last {{ selectedDays }} Days
              <svg
                class="h-3 w-3 transform-gpu text-gray-500 transition-transform"
                :class="{ 'rotate-180': showDropdown }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <transition
              enter-active-class="transition-all transform-gpu duration-200 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all transform-gpu duration-150 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-1"
            >
              <div
                v-if="showDropdown"
                class="absolute top-full left-0 z-50 mt-2 w-fit rounded-xl border border-gray-200/60 bg-white whitespace-nowrap shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-50/5"
                @mouseenter="handleMouseIn"
                @mouseleave="handleMouseOut"
              >
                <button
                  v-for="option in [7, 30, 90]"
                  :key="option"
                  @click="
                    selectedDays = option;
                    showDropdown = false;
                  "
                  class="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50"
                >
                  Last {{ option }} days
                </button>
              </div>
            </transition>
          </div>

          <!-- Refresh Button -->
          <button
            type="button"
            :disabled="loading"
            @click="fetchAllData"
            class="group flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-medium text-white shadow-md transition-all select-none hover:bg-gray-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <svg
              :class="[loading ? 'animate-spin' : 'group-hover:rotate-180', 'h-4 w-4 transition-transform']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {{ loading ? "Loading..." : "Refresh" }}
          </button>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            {{ error }}
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Loading Skeleton -->
          <template v-if="loading && !overviewData">
            <div v-for="i in 4" :key="i" class="squircle h-32 animate-pulse bg-white/60 dark:bg-gray-800/60"></div>
          </template>

          <!-- Actual Cards -->
          <template v-else>
            <!-- Total Visits (PV) -->
            <div
              class="group squircle squircle cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/70"
            >
              <div class="mb-3 flex items-center gap-2">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Visits</span>
              </div>
              <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(overviewData?.total_visits ?? 0) }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Page Views</p>
            </div>

            <!-- Unique Visitors (UV) -->
            <div
              class="group squircle squircle cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/70"
            >
              <div class="mb-3 flex items-center gap-2">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Visitors</span>
              </div>
              <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(overviewData?.unique_visitors ?? 0) }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">By IP address</p>
            </div>

            <!-- Unique Visitor IDs -->
            <div
              class="group squircle squircle cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/70"
            >
              <div class="mb-3 flex items-center gap-2">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Visitor IDs</span>
              </div>
              <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatNumber(overviewData?.unique_visitor_ids ?? 0) }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">By visitor ID</p>
            </div>

            <!-- Avg Visits Per Day -->
            <div
              class="group squircle squircle cursor-pointer overflow-hidden border border-gray-200/60 bg-white/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/70"
            >
              <div class="mb-3 flex items-center gap-2">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg/Day</span>
              </div>
              <p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {{ avgVisitsPerDay }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Last {{ selectedDays }} days</p>
            </div>
          </template>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AreaChart class="squircle dark:bg-gray-900/80" />
          <PopularPagesChartCard :loading="loading" :overview-data="overviewData" class="squircle" />
        </div>

        <!-- Device & Browser Analytics Section -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OsCharts class="squircle" :loading="loading" :os-stats="overviewData?.os_stats ?? []" />
          <BrowserAnalytics class="squircle" :loading="loading" :browser-stats="overviewData?.browser_stats ?? []" />
        </div>

        <!-- Server Monitoring Section -->
        <ServerMonitor custom-class="squircle" ref="serverMonitorRef" :auto-start="true" />

        <!-- User Login Logs Table -->
        <div
          class="squircle squircle overflow-hidden border border-gray-200/60 bg-white/30 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
        >
          <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <icon-user class="inline-block size-4" />
            User Login Logs
          </h2>

          <!-- Loading State -->
          <div v-if="loading && !loginLogsData" class="py-8">
            <div class="space-y-3">
              <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/40"></div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="loginLogsData?.list.length === 0" class="py-12 text-center text-gray-500 dark:text-gray-400">
            <svg
              class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p>No user login records found</p>
          </div>

          <!-- Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="border-b border-gray-200 text-left text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
                >
                  <th class="pb-3 font-medium">User</th>
                  <th class="pb-3 font-medium">Login Count</th>
                  <th class="pb-3 font-medium">Last Login</th>
                  <th class="pb-3 font-medium">Current Login</th>
                  <th class="pb-3 font-medium">Last IP</th>
                  <th class="pb-3 font-medium">Current IP</th>
                  <th class="pb-3 font-medium">Active</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="log in loginLogsData?.list"
                  :key="log.user_id"
                  class="text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td class="py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {{ log.username?.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-gray-100">
                          {{ log.name || log.username }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">@{{ log.username }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4">
                    <span
                      class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {{ log.login_count }} times
                    </span>
                  </td>
                  <td class="py-4 text-gray-600 dark:text-gray-300">
                    {{ formatDateTime(log.last_login_at) }}
                  </td>
                  <td class="py-4 text-gray-600 dark:text-gray-300">
                    {{ formatDateTime(log.current_login_at) }}
                  </td>
                  <td class="py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {{ log.last_login_ip || "-" }}
                  </td>
                  <td class="py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {{ log.current_login_ip || "-" }}
                  </td>
                  <td>
                    <span
                      class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {{ log.active ? "Online" : "Offline" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="loginLogsData && loginLogsData.total_pages > 1"
            class="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Showing
              {{ (loginLogsData.page - 1) * loginLogsData.page_size + 1 }} to
              {{ Math.min(loginLogsData.page * loginLogsData.page_size, loginLogsData.total) }}
              of {{ loginLogsData.total }} results
            </p>
            <div class="flex gap-2">
              <button
                :disabled="loginLogsData.page <= 1"
                @click="changePage(loginLogsData.page - 1)"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                :disabled="loginLogsData.page >= loginLogsData.total_pages"
                @click="changePage(loginLogsData.page + 1)"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Back to Home -->
        <div class="mt-12 text-center">
          <RouterLink
            to="/"
            class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from "@/api/request";
import IconUser from "@/components/icons/IconUser.vue";
import { useAuthStore } from "@/stores/auth";
import { useScroll } from "@vueuse/core";
import dayjs from "dayjs";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AreaChart from "./components/AreaChart.vue";
import BrowserAnalytics from "./components/BrowserAnalytics.vue";
import OsCharts from "./components/OsCharts.vue";
import PopularPagesChartCard from "./components/PopularPagesChartCard.vue";
import ServerMonitor from "./components/ServerMonitor.vue";

// Types
interface OverviewData {
  total_visits: number;
  unique_visitors: number;
  unique_visitor_ids: number;
  top_pages: { page_path: string; count: number }[];
  browser_stats: {
    browser_name: string;
    browser_version: string;
    count: number;
  }[];
  os_stats: { os_name: string; count: number }[];
  daily_trend: { date: string; count: number }[];
  period_days: number;
}

interface LoginLog {
  user_id: number;
  username: string;
  name: string | null;
  login_count: number;
  last_login_at: string | null;
  current_login_at: string | null;
  last_login_ip: string | null;
  current_login_ip: string | null;
  active: boolean;
}

interface LoginLogsResponse {
  list: LoginLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

defineOptions({
  name: "AnalyticsView",
});

const auth = useAuthStore();
const router = useRouter();
const { y } = useScroll(window);

const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const selectedDays = ref(7);
const overviewData = ref<OverviewData | null>(null);
const loginLogsData = ref<LoginLogsResponse | null>(null);
const loginLogsPage = ref(1);
const serverMonitorRef = ref<InstanceType<typeof ServerMonitor> | null>(null);
const showDropdown = ref<boolean>(false);

// Computed
const titleStyle = computed(() => ({
  transform: `translateY(${y.value * 0.4}px)`,
}));

const sectionStyle = computed(() => {
  const scale = Math.min(1, 0.95 + y.value * 0.0005);
  return {
    width: `${100 * scale}%`,
  };
});

const avgVisitsPerDay = computed(() => {
  if (!overviewData.value?.total_visits || !selectedDays.value) return "0";
  const avg = overviewData.value.total_visits / selectedDays.value;
  return avg.toFixed(1);
});

// Methods
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
};

const fetchOverview = async () => {
  try {
    const res = await request.get("/status/overview", {
      params: { days: selectedDays.value },
    });
    if (res.data.code === 200) {
      overviewData.value = res.data.data;
    } else {
      error.value = res.data.message || "Failed to load overview data";
    }
  } catch (err) {
    console.error("Failed to fetch overview:", err);
    error.value = "Failed to load overview data. Please try again.";
  }
};

const fetchLoginLogs = async () => {
  try {
    const res = await request.get("/status/user-logins", {
      params: {
        days: selectedDays.value,
        page: loginLogsPage.value,
        page_size: 20,
      },
    });
    if (res.data.code === 200) {
      loginLogsData.value = res.data.data;
    } else {
      error.value = res.data.message || "Failed to load login logs";
    }
  } catch (err) {
    console.error("Failed to fetch login logs:", err);
    error.value = "Failed to load login logs. Please try again.";
  }
};

const fetchAllData = async () => {
  loading.value = true;
  error.value = "";
  try {
    await Promise.all([fetchOverview(), fetchLoginLogs()]);
  } finally {
    loading.value = false;
  }
};

const changePage = (page: number) => {
  loginLogsPage.value = page;
  fetchLoginLogs();
};

// Watch for days selection change
watch(
  selectedDays,
  (newVal, oldVal) => {
    // Guard: prevent infinite loop by comparing values
    if (newVal === oldVal) return;
    loginLogsPage.value = 1;
    fetchAllData();
  },
  { flush: "pre" },
);

// Lifecycle
onMounted(async () => {
  // Check auth
  if (auth.user === null && !auth.loading) {
    await auth.fetchUser();
  }

  if (!auth.isAuthenticated || auth.user?.id !== 1) {
    router.push("/");
    return;
  }

  await fetchAllData();
});

// Dropdown hover handlers to prevent it from disappearing when moving mouse
let dropdownHoverTimeout: number | null = null;
const handleMouseIn = () => {
  if (dropdownHoverTimeout) {
    clearTimeout(dropdownHoverTimeout);
    dropdownHoverTimeout = null;
  }

  showDropdown.value = true;
};
const handleMouseOut = () => {
  dropdownHoverTimeout = window.setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};
</script>
