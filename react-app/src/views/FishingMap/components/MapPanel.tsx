import type { RefObject } from 'react';

import { fishingSpots } from '../constants';

interface MapPanelProps {
  isMapReady: boolean;
  mapContainerRef: RefObject<HTMLDivElement | null>;
}

export function MapPanel({ isMapReady, mapContainerRef }: MapPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white p-4 shadow-md dark:border-gray-800 dark:bg-slate-900">
      <div className="flex items-center justify-between p-2 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span>{isMapReady ? '地图已就绪' : '地图加载中'}</span>
        <span>共 {fishingSpots.length} 个钓点</span>
      </div>
      <div ref={mapContainerRef} className="h-[46dvh] w-full rounded-2xl" />
    </div>
  );
}
