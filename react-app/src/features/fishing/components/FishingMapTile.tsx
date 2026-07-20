/**
 * FishingMapTile —— 全屏地图背景。
 *
 * 固定 inset-0 占据整个 viewport (z-0), 处于 DashboardSheet (z-30) 之下。
 * 路线状态 UI 全部上移至 DashboardSheet, 这里只承载地图本身。
 */
import { useRef } from 'react';

import { useRouteMapStore } from '@/stores/routeMapStore';

import { useMap } from '../hooks/useMap';
import { fishingMapService } from '../api/service';

interface FishingMapTileProps {
  /**
   * 父组件若需要 ref 控制 map（如 forwardRef），可传 ref。
   * 不传则内部自管 —— 这是默认场景。
   */
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function FishingMapTile({
  containerRef: externalRef,
}: FishingMapTileProps) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = externalRef ?? internalRef;

  const serviceRef = useRef(fishingMapService());
  const planRouteAction = useRouteMapStore((s) => s.planRouteAction);

  const getSecurityJsCode = (): Promise<string> =>
    serviceRef.current.getSecurityJsCode();

  /**
   * marker click 回调：useMap 内部已经调过 planRoute,
   * 这里再把 planRoute 包进 store 的串行化入口（错误通知 + routeSeq 守卫）。
   */
  const handleMarkerClick = async (
    index: number,
    userPosition: [number, number],
  ): Promise<void> => {
    void userPosition;
    await planRouteAction({
      spotIndex: index,
      runner: async () => ({ distance: 0, time: 0 }),
      fallbackError: '路线规划失败，请检查网络连接或定位权限',
    });
  };

  const { isMapReady } = useMap(
    containerRef,
    getSecurityJsCode,
    handleMarkerClick,
  );

  return (
    <div className="fixed inset-0 z-0">
      <div
        ref={containerRef}
        className="amap-fs h-full w-full"
        aria-label="fishing map"
      />
      {!isMapReady && (
        <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-xs backdrop-blur-[2px]">
          地图加载中…
        </div>
      )}
    </div>
  );
}