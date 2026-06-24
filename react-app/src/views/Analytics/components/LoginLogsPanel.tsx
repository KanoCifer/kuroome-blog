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
      <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
        {item.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-foreground font-medium">
          {item.name || item.username}
        </p>
        <p className="text-muted-foreground text-xs">@{item.username}</p>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-success/10 text-success' : 'bg-muted text-card-foreground'
      }`}
    >
      {active ? 'Online' : 'Offline'}
    </span>
  );
}

function MobileLogCard({ item }: { item: UserLoginLogItem }) {
  return (
    <article className="border-border/60 bg-background rounded-3xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <UserAvatar item={item} />
        <StatusBadge active={item.active} />
      </div>

      <div className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs">
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
    <section className="border-border/60 bg-background/85 overflow-hidden rounded-3xl border p-3.5 shadow-sm">
      <h3 className="text-foreground mb-3 text-base font-semibold">
        User Login Logs
      </h3>

      {loading && !data ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-muted h-20 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : null}

      {!loading && data && data.list.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
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
            <div className="border-border mt-4 flex flex-col gap-3 border-t pt-4 text-sm">
              <p className="text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1} to{' '}
                {Math.min(data.page * data.pageSize, data.total)} of{' '}
                {data.total} results
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className="border-border hover:bg-muted rounded-lg border px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={data.page <= 1}
                  onClick={() => onPageChange(data.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="border-border hover:bg-muted rounded-lg border px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
