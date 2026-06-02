import { useRouteMapStore } from '@/stores/routeMapStore';
import { formatDistance, formatDuration } from '../utils';

export function RouteStatusCard() {
  const { isPlanningRoute, routeInfo, selectedSpotIndex } = useRouteMapStore();
  const clearRoute = useRouteMapStore((s) => s.clearRoute);

  if (isPlanningRoute) {
    return (
      <div className="border-primary/20 bg-primary/10 text-primary flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm">
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
      <div className="border-border/70 bg-card/80 rounded-2xl border p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-foreground text-sm font-semibold">路线信息</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              距离 {formatDistance(routeInfo.distance)}
            </p>
            <p className="text-muted-foreground text-xs">
              耗时 {formatDuration(routeInfo.time)}
            </p>
            {selectedSpotIndex !== null && (
              <p className="text-primary mt-1 text-xs">
                已选择钓点 #{selectedSpotIndex + 1}
              </p>
            )}
          </div>
          <button
            onClick={clearRoute}
            className="bg-destructive hover:bg-destructive/90 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors"
          >
            清除路线
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/70 bg-card/80 text-muted-foreground rounded-2xl border p-4 text-sm shadow-sm backdrop-blur-sm">
      点击地图上的钓点标记，自动规划从当前位置到钓点的路线。
    </div>
  );
}
