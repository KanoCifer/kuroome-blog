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
    <div className="from-background/90 to-background min-h-dvh w-full bg-linear-to-b px-3 pt-20 pb-28">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <section className="space-y-2">
          <span className="bg-foreground text-background inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide">
            Admin Only
          </span>
          <h1 className="text-foreground text-2xl font-semibold">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Mobile-first monitoring for key traffic and system metrics.
          </p>
        </section>

        <section className="border-border/60 bg-card/80 rounded-3xl border p-3.5 shadow-sm">
          <DayFilter selectedDays={selectedDays} onChange={setSelectedDays} />

          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
          <section className="border-destructive bg-destructive/10 text-destructive rounded-xl border p-4 text-sm">
            {error}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <StatsCard
            title="Total Visits"
            value={formatNumber(overviewData?.totalVisits ?? 0)}
            subtitle="Page Views"
            icon={<Waypoints className="h-4 w-4" />}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Unique Visitors"
            value={formatNumber(overviewData?.uniqueVisitors ?? 0)}
            subtitle="By IP"
            icon={<Users className="h-4 w-4" />}
            iconClassName="bg-success/10 text-success"
          />
          <StatsCard
            title="Visitor IDs"
            value={formatNumber(overviewData?.uniqueVisitorIds ?? 0)}
            subtitle="By ID"
            icon={<UserRound className="h-4 w-4" />}
            iconClassName="bg-accent text-accent-foreground"
          />
          <StatsCard
            title="Avg/Day"
            value={avgVisitsPerDay}
            subtitle={`${selectedDays} days`}
            icon={<BarChart3 className="h-4 w-4" />}
            iconClassName="bg-warning/10 text-warning"
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 hover:shadow-lg"
            onClick={() => navigate('/')}
            type="button"
          >
            返回首页
          </button>
          <p className="text-muted-foreground mt-2 text-xs">
            Updated at {formatDate(new Date().toISOString())}
          </p>
        </section>
      </div>
    </div>
  );
}
