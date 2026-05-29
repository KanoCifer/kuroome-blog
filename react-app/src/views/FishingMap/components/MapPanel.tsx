import type { RefObject } from 'react';

interface MapPanelProps {
  mapContainerRef: RefObject<HTMLDivElement | null>;
}

export function MapPanel({ mapContainerRef }: MapPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md">
      <div ref={mapContainerRef} className="h-[46dvh] w-full rounded-2xl" />
    </div>
  );
}
