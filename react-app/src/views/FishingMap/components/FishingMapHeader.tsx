interface FishingMapHeaderProps {
  onBack: () => void;
}

export function FishingMapHeader({ onBack }: FishingMapHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 bg-white/80 px-4 py-3 backdrop-blur-md dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          aria-label="返回上一页"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            钓鱼地图
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            探索钓点并一键规划路线
          </p>
        </div>
      </div>
    </header>
  );
}
