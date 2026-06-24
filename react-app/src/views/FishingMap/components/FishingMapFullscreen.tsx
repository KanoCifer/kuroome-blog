import { useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useRouteMapStore } from '@/stores/routeMapStore';

import { useMap } from '../hooks/useMap';
import { fishingMapService } from '../service';
import { formatDistance, formatDuration } from '../utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FishingMapFullscreen({ open, onClose }: Props) {
  // 只在 open=true 时挂载内容组件，确保 useMap 的初始化 effect
  // 跑的时候 containerRef.current 已经有值（否则会卡在"加载中"）。
  return (
    <AnimatePresence>
      {open && <FullscreenContent key="fs" onClose={onClose} />}
    </AnimatePresence>
  );
}

function FullscreenContent({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const serviceRef = useRef(fishingMapService());
  const planRouteAction = useRouteMapStore((s) => s.planRouteAction);

  const getSecurityJsCode = (): Promise<string> =>
    serviceRef.current.getSecurityJsCode();

  const handleMarkerClick = useCallback(
    async (index: number) => {
      await planRouteAction({
        spotIndex: index,
        runner: async () => ({ distance: 0, time: 0 }),
        fallbackError: '路线规划失败',
      });
    },
    [planRouteAction],
  );

  const { isMapReady, clearRoute } = useMap(
    containerRef,
    getSecurityJsCode,
    handleMarkerClick,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-background fixed inset-0 z-50"
    >
      <div
        ref={containerRef}
        className="amap-fs h-full w-full"
        aria-label="fishing map fullscreen"
      />
      {!isMapReady && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
          地图加载中…
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="退出全屏"
        className="bg-background/90 border-border/40 hover:bg-background absolute top-[calc(env(safe-area-inset-top,0)+12px)] right-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <AnimatePresence>
        <RouteOverlay onClearRoute={clearRoute} onClose={onClose} />
      </AnimatePresence>
    </motion.div>
  );
}

function RouteOverlay({
  onClearRoute,
  onClose,
}: {
  onClearRoute: () => void;
  onClose: () => void;
}) {
  const isPlanning = useRouteMapStore((s) => s.isPlanningRoute);
  const routeInfo = useRouteMapStore((s) => s.routeInfo);

  if (!isPlanning && !routeInfo) return null;

  if (isPlanning) {
    return (
      <motion.div
        key="planning"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background/90 border-border absolute inset-x-3 bottom-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md"
      >
        <p className="text-muted-foreground text-sm">正在规划路线…</p>
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
      className="bg-background/90 border-border absolute inset-x-3 bottom-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
            路线信息
          </p>
          <p className="text-foreground font-family-averia text-2xl leading-none tabular-nums">
            <span>{formatDistance(routeInfo.distance)}</span>
            <span className="text-muted-foreground mx-2 text-base">·</span>
            <span>{formatDuration(routeInfo.time)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearRoute}
            className="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          >
            清除
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-border hover:bg-muted rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </motion.div>
  );
}
