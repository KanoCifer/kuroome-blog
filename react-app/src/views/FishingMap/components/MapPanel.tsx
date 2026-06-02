import type { RefObject } from 'react';

interface MapPanelProps {
  mapContainerRef: RefObject<HTMLDivElement | null>;
}

export function MapPanel({ mapContainerRef }: MapPanelProps) {
  return (
    <div className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-md">
      <div ref={mapContainerRef} className="h-[46dvh] w-full rounded-2xl" />
    </div>
  );
}
