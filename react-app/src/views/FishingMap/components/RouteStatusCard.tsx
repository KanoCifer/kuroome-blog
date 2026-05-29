import { useRouteMapStore } from '@/stores/routeMapStore';
import { formatDistance, formatDuration } from '../utils';

export function RouteStatusCard() {
  const { isPlanningRoute, routeInfo, selectedSpotIndex } = useRouteMapStore();
  const clearRoute = useRouteMapStore((s) => s.clearRoute);

  if (isPlanningRoute) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        正在规划路线...
      </div>
    );
  }

  if (routeInfo) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              路线信息
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              距离 {formatDistance(routeInfo.distance)}
            </p>
            <p className="text-xs text-muted-foreground">
              耗时 {formatDuration(routeInfo.time)}
            </p>
            {selectedSpotIndex !== null && (
              <p className="mt-1 text-xs text-primary">
                已选择钓点 #{selectedSpotIndex + 1}
              </p>
            )}
          </div>
          <button
            onClick={clearRoute}
            className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-destructive/90"
          >
            清除路线
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
      点击地图上的钓点标记，自动规划从当前位置到钓点的路线。
    </div>
  );
}
