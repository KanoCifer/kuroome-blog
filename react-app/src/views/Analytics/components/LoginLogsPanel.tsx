import dayjs from 'dayjs';

import type { UserLoginLogData, UserLoginLogItem } from '../types';

const formatUtc = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
};

interface LoginLogsPanelProps {
  data: UserLoginLogData | null;
  loading: boolean;
  onPageChange: (nextPage: number) => void;
}

function UserAvatar({ item }: { item: UserLoginLogItem }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        {item.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {item.name || item.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          @{item.username}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {active ? 'Online' : 'Offline'}
    </span>
  );
}

function MobileLogCard({ item }: { item: UserLoginLogItem }) {
  return (
    <article className="rounded-3xl border border-gray-200/60 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/70">
      <div className="flex items-start justify-between gap-3">
        <UserAvatar item={item} />
        <StatusBadge active={item.active} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span>Login Count</span>
        <span className="text-right font-medium">{item.loginCount}</span>
        <span>Last Login</span>
        <span className="text-right">{formatUtc(item.lastLoginAt)}</span>
        <span>Current Login</span>
        <span className="text-right">{formatUtc(item.currentLoginAt)}</span>
        <span>Last IP</span>
        <span className="text-right font-mono">{item.lastLoginIp || '-'}</span>
        <span>Current IP</span>
        <span className="text-right font-mono">
          {item.currentLoginIp || '-'}
        </span>
      </div>
    </article>
  );
}

export function LoginLogsPanel({
  data,
  loading,
  onPageChange,
}: LoginLogsPanelProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200/60 bg-white/85 p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-100">
        User Login Logs
      </h3>

      {loading && !data ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/40"
            />
          ))}
        </div>
      ) : null}

      {!loading && data && data.list.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No user login records found
        </p>
      ) : null}

      {data && data.list.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.list.map((item) => (
              <MobileLogCard key={item.userId} item={item} />
            ))}
          </div>

          {data.totalPages > 1 ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                Showing {(data.page - 1) * data.pageSize + 1} to{' '}
                {Math.min(data.page * data.pageSize, data.total)} of{' '}
                {data.total} results
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-lg border border-gray-200 px-3 py-2 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  disabled={data.page <= 1}
                  onClick={() => onPageChange(data.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="rounded-lg border border-gray-200 px-3 py-2 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-700"
                  disabled={data.page >= data.totalPages}
                  onClick={() => onPageChange(data.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
