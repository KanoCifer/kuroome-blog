<template>
  <BasicDetail
    title="Analytics Dashboard"
    subtitle="Admin Only · Monitor your website performance"
  >
    <!-- Error Message - Full Width -->
    <div v-if="error" class="col-span-1 sm:col-span-2 lg:col-span-3">
      <div
        class="border-destructive/30 bg-destructive/10 text-destructive squircle border p-4"
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
    </div>

    <!-- Filter Card -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-3">
      <div
        class="squircle border-border/60 bg-background/80 flex flex-col items-center justify-between gap-4 border p-4 shadow-sm sm:flex-row"
      >
        <!-- Days Filter -->
        <div class="relative">
          <button
            class="border-border bg-background text-foreground hover:border-border/70 hover:bg-muted focus:border-primary focus:ring-primary/20 flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium shadow-sm transition-all focus:ring-2"
            @click="showDropdown = !showDropdown"
            @mouseenter="handleMouseIn"
            @mouseleave="handleMouseOut"
          >
            <svg
              class="text-muted-foreground h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Last {{ selectedDays }} Days
            <svg
              class="text-muted-foreground h-3 w-3 transition-transform"
              :class="{ 'rotate-180': showDropdown }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
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
              class="border-border bg-background absolute top-full left-0 z-50 mt-2 w-fit rounded-xl border whitespace-nowrap shadow-lg"
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
                class="text-foreground hover:bg-muted block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors"
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
          class="group bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-medium shadow-md transition-all select-none hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            :class="[
              loading ? 'animate-spin' : 'group-hover:rotate-180',
              'h-4 w-4 transition-transform',
            ]"
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
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Stats Cards Row - Full Width -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-3">
      <!-- Loading Skeleton -->
      <template v-if="loading && !overviewData">
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-background/60 squircle h-32 animate-pulse"
          ></div>
        </div>
      </template>

      <!-- Actual Stats Cards -->
      <div v-else class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <!-- Total Visits (PV) -->
        <div
          class="group squircle border-border/60 bg-background/30 cursor-pointer overflow-hidden border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="mb-3 flex items-center gap-2">
            <div
              class="bg-primary/15 text-primary flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
            <span class="text-muted-foreground text-sm font-medium"
              >Total Visits</span
            >
          </div>
          <p class="text-foreground text-3xl font-bold">
            {{ formatNumber(overviewData?.total_visits ?? 0) }}
          </p>
          <p class="text-muted-foreground mt-1 text-xs">Page Views</p>
        </div>

        <!-- Unique Visitors (UV) -->
        <div
          class="group squircle border-border/60 bg-background/30 cursor-pointer overflow-hidden border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="mb-3 flex items-center gap-2">
            <div
              class="bg-success/20 text-success flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span class="text-muted-foreground text-sm font-medium"
              >Unique Visitors</span
            >
          </div>
          <p class="text-foreground text-3xl font-bold">
            {{ formatNumber(overviewData?.unique_visitors ?? 0) }}
          </p>
          <p class="text-muted-foreground mt-1 text-xs">By IP address</p>
        </div>

        <!-- Visitor IDs -->
        <div
          class="group squircle border-border/60 bg-background/30 cursor-pointer overflow-hidden border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="mb-3 flex items-center gap-2">
            <div
              class="bg-muted text-foreground flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <span class="text-muted-foreground text-sm font-medium"
              >Visitor IDs</span
            >
          </div>
          <p class="text-foreground text-3xl font-bold">
            {{ formatNumber(overviewData?.unique_visitor_ids ?? 0) }}
          </p>
          <p class="text-muted-foreground mt-1 text-xs">By visitor ID</p>
        </div>

        <!-- Avg Visits Per Day -->
        <div
          class="group squircle border-border/60 bg-background/30 cursor-pointer overflow-hidden border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="mb-3 flex items-center gap-2">
            <div
              class="bg-warning/20 text-warning flex h-10 w-10 items-center justify-center rounded-xl"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span class="text-muted-foreground text-sm font-medium"
              >Avg/Day</span
            >
          </div>
          <p class="text-foreground text-3xl font-bold">
            {{ avgVisitsPerDay }}
          </p>
          <p class="text-muted-foreground mt-1 text-xs">
            Last {{ selectedDays }} days
          </p>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="col-span-1 sm:col-span-2">
      <TrendChartCard
        :loading="loading"
        :overview-data="overviewData"
        :selected-days="selectedDays"
      />
    </div>
    <div class="col-span-1">
      <PopularPagesChartCard :loading="loading" :overview-data="overviewData" />
    </div>

    <!-- Device & Browser Analytics Section -->
    <div class="col-span-1">
      <OsCharts :loading="loading" :os-stats="overviewData?.os_stats ?? []" />
    </div>
    <div class="col-span-1 sm:col-span-2">
      <BrowserAnalytics
        :loading="loading"
        :browser-stats="overviewData?.browser_stats ?? []"
      />
    </div>

    <!-- Server Monitor - Full Width -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-3">
      <ServerMonitor
        custom-class="squircle"
        ref="serverMonitorRef"
        :auto-start="true"
      />
    </div>

    <!-- User Login Logs Table - Full Width -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-3">
      <div
        class="squircle border-border/60 bg-background/30 overflow-hidden border p-6 shadow-sm"
      >
        <h2
          class="text-foreground mb-4 flex items-center gap-2 text-lg font-bold"
        >
          <icon-user class="inline-block size-4" />
          User Login Logs
        </h2>

        <!-- Loading State -->
        <div v-if="loading && !loginLogsData" class="py-8">
          <div class="space-y-3">
            <div
              v-for="i in 5"
              :key="i"
              class="bg-muted h-12 animate-pulse rounded-lg"
            ></div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="loginLogsData?.list.length === 0"
          class="text-muted-foreground py-12 text-center"
        >
          <svg
            class="text-muted-foreground/40 mx-auto mb-4 h-12 w-12"
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
                class="border-border text-muted-foreground border-b text-left text-sm"
              >
                <th class="pb-3 font-medium">User</th>
                <th class="pb-3 font-medium">Login Count</th>
                <th class="pb-3 font-medium">Last Login</th>
                <th class="pb-3 font-medium">Current Login</th>
                <th class="pb-3 font-medium">Last IP</th>
                <th class="pb-3 font-medium">Current IP</th>
              </tr>
            </thead>
            <tbody class="divide-border divide-y">
              <tr
                v-for="log in loginLogsData?.list"
                :key="log.user_id"
                class="hover:bg-muted/30 text-sm transition-colors"
              >
                <td class="py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="bg-primary/15 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                    >
                      {{ log.username?.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-foreground font-medium">
                        {{ log.name || log.username }}
                      </p>
                      <p class="text-muted-foreground text-xs">
                        @{{ log.username }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="py-4">
                  <span
                    class="bg-success/20 text-success inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {{ log.login_count }} times
                  </span>
                </td>
                <td class="text-foreground/80 py-4">
                  {{ formatDateTime(log.last_login_at) }}
                </td>
                <td class="text-foreground/80 py-4">
                  {{ formatDateTime(log.current_login_at) }}
                </td>
                <td class="text-muted-foreground py-4 font-mono text-xs">
                  {{ log.last_login_ip || '-' }}
                </td>
                <td class="text-muted-foreground py-4 font-mono text-xs">
                  {{ log.current_login_ip || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="loginLogsData && loginLogsData.total_pages > 1"
          class="border-border mt-4 flex items-center justify-between border-t pt-4"
        >
          <p class="text-muted-foreground text-sm">
            Showing
            {{ (loginLogsData.page - 1) * loginLogsData.page_size + 1 }} to
            {{
              Math.min(
                loginLogsData.page * loginLogsData.page_size,
                loginLogsData.total,
              )
            }}
            of {{ loginLogsData.total }} results
          </p>
          <div class="flex gap-2">
            <button
              :disabled="loginLogsData.page <= 1"
              @click="changePage(loginLogsData.page - 1)"
              class="hover:bg-muted text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              :disabled="loginLogsData.page >= loginLogsData.total_pages"
              @click="changePage(loginLogsData.page + 1)"
              class="hover:bg-muted text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </BasicDetail>
</template>

<script setup lang="ts">
import BasicDetail from '@/components/basic/BasicDetail.vue';
import IconUser from '@/components/icons/IconUser.vue';
import { analyticsGateway } from '@/api/shared';
import { useAuthStore } from '@/auth/stores/auth';
import dayjs from 'dayjs';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import TrendChartCard from './components/TrendChartCard.vue';
import BrowserAnalytics from './components/BrowserAnalytics.vue';
import OsCharts from './components/OsCharts.vue';
import PopularPagesChartCard from './components/PopularPagesChartCard.vue';
import ServerMonitor from './components/ServerMonitor.vue';

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
  name: 'AnalyticsView',
});

const auth = useAuthStore();
const router = useRouter();

const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const selectedDays = ref(7);
const overviewData = ref<OverviewData | null>(null);
const loginLogsData = ref<LoginLogsResponse | null>(null);
const loginLogsPage = ref(1);
const serverMonitorRef = ref<InstanceType<typeof ServerMonitor> | null>(null);
const showDropdown = ref<boolean>(false);

// Computed
const avgVisitsPerDay = computed(() => {
  if (!overviewData.value?.total_visits || !selectedDays.value) return '0';
  const avg = overviewData.value.total_visits / selectedDays.value;
  return avg.toFixed(1);
});

// Methods
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
};

const fetchOverview = async () => {
  try {
    const res = await analyticsGateway.getOverview(selectedDays.value);
    overviewData.value = res.data as unknown as OverviewData;
  } catch (err) {
    console.error('Failed to fetch overview:', err);
    error.value = 'Failed to load overview data. Please try again.';
  }
};

const fetchLoginLogs = async () => {
  try {
    const res = await analyticsGateway.getUserLogins({
      days: selectedDays.value,
      page: loginLogsPage.value,
      page_size: 20,
    });
    loginLogsData.value = res.data as unknown as LoginLogsResponse;
  } catch (err) {
    console.error('Failed to fetch login logs:', err);
    error.value = 'Failed to load login logs. Please try again.';
  }
};

const fetchAllData = async () => {
  loading.value = true;
  error.value = '';
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
  { flush: 'pre' },
);

// Lifecycle
onMounted(async () => {
  // Check auth
  if (auth.user === null && !auth.loading) {
    await auth.fetchUser();
  }

  if (!auth.isAuthenticated || auth.user?.id !== 1) {
    router.push('/');
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
