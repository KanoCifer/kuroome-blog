export function BlogLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card animate-pulse rounded-2xl p-4">
          <div className="bg-muted h-6 w-3/4 rounded-lg" />
          <div className="bg-muted mt-3 h-4 w-1/4 rounded" />
          <div className="mt-3 space-y-2">
            <div className="bg-muted h-3 w-full rounded" />
            <div className="bg-muted h-3 w-5/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
