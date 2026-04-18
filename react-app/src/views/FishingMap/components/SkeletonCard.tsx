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
          <div className="h-3.5 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* main value */}
      <div className="h-10 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />

      {/* grid row */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 rounded-lg bg-white/60 px-2 py-2 dark:bg-gray-800/60"
          >
            <div className="h-2.5 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* optional chart */}
      {hasChart && (
        <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      )}

      {/* optional bottom row */}
      {hasBottomRow && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60"
            >
              <div className="h-2 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3.5 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
