import type { RefObject } from 'react';

interface MapPanelProps {
  mapContainerRef: RefObject<HTMLDivElement | null>;
}

export function MapPanel({ mapContainerRef }: MapPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-md dark:border-gray-800 dark:bg-slate-900">
      <div ref={mapContainerRef} className="h-[46dvh] w-full rounded-2xl" />
    </div>
  );
}
