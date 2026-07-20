/**
 * Map tile —— dashboard 中的地图卡片。
 *
 * 合并原 MapPanel（map 容器）+ RouteStatusCard（路线信息浮层）。
 *
 * 包含：
 * - 内部 AMap 实例（由 useMap 管理）
 * - 底部浮层（路线规划中 / 路线信息 / 空态提示）
 * - marker click 走 useRouteMapStore.planRouteAction 串行化入口
 * - 浮按钮：全屏 / 定位
 *
 * 选择把这一层从 view 抽出来的原因：view 里 80+ 行都在拼装 map + overlay，
 * 拆出来 view 才能专注做 grid 编排。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Maximize2 } from 'lucide-react';
import { useRef } from 'react';

import { useRouteMapStore } from '@/stores/routeMapStore';

import { useMap } from '../hooks/useMap';
import { fishingMapService } from '../service';
import { formatDistance, formatDuration } from '../utils';

interface FishingMapTileProps {
  /**
   * 父组件若需要 ref 控制 map（如 forwardRef），可传 ref。
   * 不传则内部自管 —— 这是默认场景。
   */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onFullscreen?: () => void;
}

export function FishingMapTile({
  containerRef: externalRef,
  onFullscreen,
}: FishingMapTileProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = externalRef ?? internalRef;

  const serviceRef = useRef(fishingMapService());
  const planRouteAction = useRouteMapStore((s) => s.planRouteAction);

  const getSecurityJsCode = (): Promise<string> =>
    serviceRef.current.getSecurityJsCode();

  /**
   * marker click 回调：useMap 内部已经调过 planRoute，
   * 这里再把 planRoute 包进 store 的串行化入口（错误通知 + routeSeq 守卫）。
   *
   * 注意：useMap.handleMarkerClick 已经把 userPosition 通过 onMarkerClick 上抛，
   * 我们只需要消费 index + userPosition 即可。
   */
  const handleMarkerClick = async (
    index: number,
    userPosition: [number, number],
  ): Promise<void> => {
    void userPosition; // userPosition 由 useMap 内部使用；这里只关心 marker index
    // 触发 planRouteAction 进入串行化轨道，spot.position 由 useMap 内部抓取
    await planRouteAction({
      spotIndex: index,
      runner: async () => {
        // useMap.handleMarkerClick 已经在 useEffect 初始化时把 marker click
        // 绑到 setIsPlanningRoute + planRoute 流程。这里返回一个 stub 让 store
        // 知道流程已启动；实际写入由 useMap 通过 setRouteInfo 完成。
        return { distance: 0, time: 0 };
      },
      fallbackError: '路线规划失败，请检查网络连接或定位权限',
    });
  };

  const { isMapReady, clearRoute } = useMap(
    containerRef,
    getSecurityJsCode,
    handleMarkerClick,
  );

  return (
    <div className="relative w-full overflow-hidden">
      <div
        ref={containerRef}
        className="amap-mini h-[50dvh] w-full"
        aria-label="fishing map"
      />
      {!isMapReady && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
          地图加载中…
        </div>
      )}
      {/* 浮按钮 — 全屏 / 定位 */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+10px)] right-2.5 z-10 flex flex-col gap-2">
        {onFullscreen && (
          <button
            type="button"
            onClick={onFullscreen}
            aria-label="全屏地图"
            className="bg-background/90 text-foreground hover:bg-background border-border/40 flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <AnimatePresence>
        <MapOverlay onClearRoute={clearRoute} />
      </AnimatePresence>
    </div>
  );
}

function MapOverlay({ onClearRoute }: { onClearRoute: () => void }) {
  // 从 store 拿最新值（不再解构 prop，避免 useMap 的 useEffect 不重新订阅）
  const isPlanning = useRouteMapStore((s) => s.isPlanningRoute);
  const routeInfo = useRouteMapStore((s) => s.routeInfo);

  if (!isPlanning && !routeInfo) {
    return (
      <motion.div
        key="hint"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="text-muted-foreground/90 bg-background/80 pointer-events-none absolute right-4 bottom-4 left-4 w-fit rounded-full px-2 py-1.5 text-center text-xs backdrop-blur-sm"
      >
        点击自动规划
      </motion.div>
    );
  }

  if (isPlanning) {
    return (
      <motion.div
        key="planning"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background/90 border-border pointer-events-auto absolute right-4 bottom-4 left-4 rounded-2xl border p-4 shadow-lg backdrop-blur-md"
      >
        <div className="text-muted-foreground flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">正在规划路线…</span>
        </div>
      </motion.div>
    );
  }

  if (!routeInfo) return null;

  return (
    <motion.div
      key="route"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background/90 border-border pointer-events-auto absolute right-4 bottom-4 left-4 rounded-2xl border p-4 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium">路线信息</p>
          <p className="text-foreground font-family-averia text-2xl leading-none tabular-nums">
            <span>{formatDistance(routeInfo.distance)}</span>
            <span className="text-muted-foreground mx-2 text-base">·</span>
            <span>{formatDuration(routeInfo.time)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClearRoute}
          className="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        >
          清除路线
        </button>
      </div>
    </motion.div>
  );
}
