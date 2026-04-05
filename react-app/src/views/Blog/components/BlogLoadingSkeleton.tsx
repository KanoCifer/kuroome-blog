export function BlogLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-white p-4 dark:bg-gray-900"
        >
          <div className="h-6 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-3 h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
