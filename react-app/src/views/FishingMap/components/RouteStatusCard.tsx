import { useRouteMapStore } from '@/stores/routeMapStore';
import { formatDistance, formatDuration } from '../utils';

export function RouteStatusCard() {
  const { isPlanningRoute, routeInfo, selectedSpotIndex } = useRouteMapStore();
  const clearRoute = useRouteMapStore((s) => s.clearRoute);

  if (isPlanningRoute) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
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
      <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              路线信息
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              距离 {formatDistance(routeInfo.distance)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              耗时 {formatDuration(routeInfo.time)}
            </p>
            {selectedSpotIndex !== null && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                已选择钓点 #{selectedSpotIndex + 1}
              </p>
            )}
          </div>
          <button
            onClick={clearRoute}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600"
          >
            清除路线
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 text-sm text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-slate-900/70 dark:text-gray-300">
      点击地图上的钓点标记，自动规划从当前位置到钓点的路线。
    </div>
  );
}
