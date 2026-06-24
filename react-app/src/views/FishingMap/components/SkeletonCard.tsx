interface SkeletonCardProps {
  hasChart?: boolean;
  hasBottomRow?: boolean;
}

export function SkeletonCard({
  hasChart = false,
  hasBottomRow = false,
}: SkeletonCardProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="mb-1 flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="bg-secondary h-3.5 w-24 animate-pulse rounded-md" />
          <div className="bg-secondary h-2.5 w-16 animate-pulse rounded-md" />
        </div>
        <div className="bg-secondary h-9 w-9 animate-pulse rounded-full" />
      </div>

      {/* main value */}
      <div className="bg-secondary h-10 w-20 animate-pulse rounded-md" />

      {/* grid row */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-background/60 flex flex-col items-center gap-1 rounded-lg px-2 py-2"
          >
            <div className="bg-secondary h-2.5 w-8 animate-pulse rounded" />
            <div className="bg-secondary h-3 w-10 animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* optional chart */}
      {hasChart && (
        <div className="bg-secondary h-24 w-full animate-pulse rounded-lg" />
      )}

      {/* optional bottom row */}
      {hasBottomRow && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-background/60 flex flex-col gap-1 rounded-lg px-3 py-2"
            >
              <div className="bg-secondary h-2 w-10 animate-pulse rounded" />
              <div className="bg-secondary h-3.5 w-14 animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
