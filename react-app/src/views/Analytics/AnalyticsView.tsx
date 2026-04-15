import { analyticsService } from '@/services/analyticsService';
import { useNotificationStore } from '@/stores/notificationState';
import { formatDate } from '@/utils/formatdate';
import {
  BarChart3,
  RefreshCw,
  UserRound,
  Users,
  Waypoints,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AreaTrendChart,
  BrowserOsCharts,
  DayFilter,
  LoginLogsPanel,
  PopularPagesChart,
  ServerStatusCard,
  StatsCard,
} from './components';
import type { OverviewData, ServerStatusData, UserLoginLogData } from './types';

const service = analyticsService();

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return String(num);
};

export default function AnalyticsView() {
  const navigate = useNavigate();
  const notifyError = useNotificationStore((state) => state.error);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loginLogsData, setLoginLogsData] = useState<UserLoginLogData | null>(
    null,
  );
  const [serverStatusData, setServerStatusData] =
    useState<ServerStatusData | null>(null);
  const [loginPage, setLoginPage] = useState(1);

  const avgVisitsPerDay = useMemo(() => {
    if (!overviewData?.totalVisits || !selectedDays) {
      return '0';
    }
    return (overviewData.totalVisits / selectedDays).toFixed(1);
  }, [overviewData?.totalVisits, selectedDays]);

  const fetchOverviewAndStatus = useCallback(async (days: number) => {
    const [overview, serverStatus] = await Promise.all([
      service.getOverview(days),
      service.getServerStatus(),
    ]);
    setOverviewData(overview);
    setServerStatusData(serverStatus);
  }, []);

  const fetchLoginLogs = useCallback(async (days: number, page: number) => {
    const res = await service.getUserLogins({
      days,
      page,
      pageSize: 20,
    });
    setLoginLogsData(res);
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverviewAndStatus(selectedDays),
        fetchLoginLogs(selectedDays, loginPage),
      ]);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load analytics data.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  }, [
    fetchLoginLogs,
    fetchOverviewAndStatus,
    loginPage,
    notifyError,
    selectedDays,
  ]);

  useEffect(() => {
    setLoginPage(1);
  }, [selectedDays]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  return (
    <div className="min-h-dvh w-full bg-linear-to-b from-sky-50/90 to-white px-3 pt-20 pb-28 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <section className="space-y-2">
          <span className="inline-flex rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white dark:bg-gray-100 dark:text-gray-900">
            Admin Only
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mobile-first monitoring for key traffic and system metrics.
          </p>
        </section>

        <section className="rounded-3xl border border-gray-200/60 bg-white/80 p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
          <DayFilter selectedDays={selectedDays} onChange={setSelectedDays} />

          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            disabled={loading}
            onClick={() => {
              void fetchAllData();
            }}
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${loading ? 'animate-spin' : ''}`}
            />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </section>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <StatsCard
            title="Total Visits"
            value={formatNumber(overviewData?.totalVisits ?? 0)}
            subtitle="Page Views"
            icon={<Waypoints className="h-4 w-4" />}
            iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <StatsCard
            title="Unique Visitors"
            value={formatNumber(overviewData?.uniqueVisitors ?? 0)}
            subtitle="By IP"
            icon={<Users className="h-4 w-4" />}
            iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <StatsCard
            title="Visitor IDs"
            value={formatNumber(overviewData?.uniqueVisitorIds ?? 0)}
            subtitle="By ID"
            icon={<UserRound className="h-4 w-4" />}
            iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <StatsCard
            title="Avg/Day"
            value={avgVisitsPerDay}
            subtitle={`${selectedDays} days`}
            icon={<BarChart3 className="h-4 w-4" />}
            iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />
        </section>

        <section className="space-y-3">
          <AreaTrendChart trend={overviewData?.dailyTrend ?? []} />
          <PopularPagesChart pages={overviewData?.topPages ?? []} />
          <BrowserOsCharts
            browserStats={overviewData?.browserStats ?? []}
            osStats={overviewData?.osStats ?? []}
          />
          <ServerStatusCard status={serverStatusData} />
          <LoginLogsPanel
            data={loginLogsData}
            loading={loading}
            onPageChange={(nextPage) => {
              setLoginPage(nextPage);
            }}
          />
        </section>

        <section className="pt-2 text-center">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            onClick={() => navigate('/')}
            type="button"
          >
            返回首页
          </button>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Updated at {formatDate(new Date().toISOString())}
          </p>
        </section>
      </div>
    </div>
  );
}
