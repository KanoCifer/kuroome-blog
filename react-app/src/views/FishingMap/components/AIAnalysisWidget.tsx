import { AnimatePresence, motion } from 'framer-motion';

interface AIAnalysisWidgetProps {
  analysisOpen: boolean;
  analysisLoading: boolean;
  analysisError: string;
  analysisResult: string;
  analysisHasData: boolean;
  onToggle: () => void;
  onClose: () => void;
  onGenerate: () => void;
}

export function AIAnalysisWidget({
  analysisOpen,
  analysisLoading,
  analysisError,
  analysisResult,
  analysisHasData,
  onToggle,
  onClose,
  onGenerate,
}: AIAnalysisWidgetProps) {
  return (
    <div className="fixed right-4 bottom-24 z-50 sm:right-6 sm:bottom-24">
      <AnimatePresence>
        {analysisOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mb-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-white/45 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/92"
          >
            <div className="flex items-center justify-between border-b border-gray-200/70 px-4 py-3 dark:border-gray-700/70">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  AI 天气分析
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  结合天气与潮汐给出建议
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="关闭分析"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3 px-4 py-3 text-sm">
              {!analysisHasData ? (
                <p className="text-gray-500 dark:text-gray-400">
                  等待天气与潮汐数据后可自动生成分析。
                </p>
              ) : analysisLoading ? (
                <p className="text-gray-500 dark:text-gray-400">
                  AI 正在分析天气变化与潮汐节奏...
                </p>
              ) : analysisError ? (
                <p className="text-red-500">{analysisError}</p>
              ) : analysisResult ? (
                <p className="max-h-56 overflow-y-auto leading-7 whitespace-pre-line text-gray-700 dark:text-gray-200">
                  {analysisResult}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  暂无分析结果，点击下方按钮生成。
                </p>
              )}

              <button
                onClick={onGenerate}
                disabled={!analysisHasData || analysisLoading}
                className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                {analysisLoading
                  ? '分析中...'
                  : analysisResult
                    ? '重新分析'
                    : '生成分析'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggle}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-linear-to-br from-slate-900/90 to-slate-700/85 text-white shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-700/70 dark:from-gray-100 dark:to-gray-300 dark:text-gray-900"
        aria-label="打开 AI 分析"
      >
        {analysisHasData && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </button>
    </div>
  );
}
