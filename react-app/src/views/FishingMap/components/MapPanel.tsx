import type { RefObject } from 'react';

import { fishingSpots } from '../constants';

interface MapPanelProps {
  isMapReady: boolean;
  mapContainerRef: RefObject<HTMLDivElement | null>;
}

export function MapPanel({ isMapReady, mapContainerRef }: MapPanelProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-md dark:border-gray-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-gray-200/80 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span>{isMapReady ? '地图已就绪' : '地图加载中'}</span>
        <span>共 {fishingSpots.length} 个钓点</span>
      </div>
      <div
        ref={mapContainerRef}
        className="h-[46dvh] min-h-[300px] w-full sm:h-[56dvh]"
      />
    </div>
  );
}
