import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, CloudOff, X } from 'lucide-react';
import { marked } from 'marked';
import { useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import { useAnalysisContext } from '../contexts/AnalysisContext';

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface AIAnalysisWidgetProps {
  onGenerate: () => void;
}

const SHIMMER_TEXTS = [
  '正在整理天气变化...',
  '正在评估体感与风况...',
  '正在结合潮汐节奏...',
];

function renderMarkdown(content: string): string {
  try {
    const rawHtml = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  } catch {
    return content;
  }
}

export function AIAnalysisWidget({ onGenerate }: AIAnalysisWidgetProps) {
  const {
    analysisOpen,
    analysisLoading,
    analysisError,
    analysisResult,
    analysisHasData,
    toggleAnalysis,
    closeAnalysis,
    setAnalysisLoading,
  } = useAnalysisContext();

  const [shimmerIndex, setShimmerIndex] = useState(0);
  const shimmerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (analysisLoading) {
      shimmerTimerRef.current = setInterval(() => {
        setShimmerIndex((i) => (i + 1) % SHIMMER_TEXTS.length);
      }, 1800);
    } else {
      if (shimmerTimerRef.current) {
        clearInterval(shimmerTimerRef.current);
        shimmerTimerRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShimmerIndex(0);
    }
    return () => {
      if (shimmerTimerRef.current) clearInterval(shimmerTimerRef.current);
    };
  }, [analysisLoading]);

  const statusLabel = (() => {
    if (analysisLoading) return '分析中';
    if (analysisError) return '分析失败';
    if (analysisResult) return '已生成';
    return '待生成';
  })();

  const statusClass = (() => {
    if (analysisLoading)
      return 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    if (analysisError)
      return 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-300';
    if (analysisResult)
      return 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    return 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
  })();

  return (
    <>
      {createPortal(
        <div className="fixed right-4 bottom-24 z-50">
          <AnimatePresence mode="wait">
            {analysisOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="group relative mb-3 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-linear-to-br from-white/80 to-white/40 shadow-2xl backdrop-blur-sm sm:w-[calc(100vw-3rem)] dark:border-gray-700/50 dark:from-gray-900/80 dark:to-gray-800/40"
              >
                {/* Decorative blobs */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-linear-to-br from-indigo-300/30 to-sky-500/20 blur-2xl transition-transform duration-700 group-hover:scale-110" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-linear-to-tr from-emerald-300/20 to-cyan-400/10 blur-2xl transition-transform duration-700 group-hover:scale-110" />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-gray-200/70 px-4 py-3 dark:border-gray-700/70">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                        AI 天气分析
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        结合实时天气与潮汐节奏给出出行建议
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`${statusClass} rounded-full px-2.5 py-0.5 text-xs font-medium`}
                      >
                        {statusLabel}
                      </span>
                      <button
                        onClick={closeAnalysis}
                        className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        aria-label="关闭分析"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 px-4 py-3">
                    {!analysisHasData ? (
                      <EmptyState
                        icon={<CloudOff className="h-6 w-6" />}
                        title="等待天气与潮汐数据加载"
                        subtitle="数据到位后即可生成分析"
                      />
                    ) : analysisLoading ? (
                      <LoadingState shimmerText={SHIMMER_TEXTS[shimmerIndex]} />
                    ) : analysisError ? (
                      <ErrorState message={analysisError} />
                    ) : analysisResult ? (
                      <ResultState html={renderMarkdown(analysisResult)} />
                    ) : (
                      <PlaceholderState />
                    )}

                    <button
                      onClick={() => {
                        onGenerate();
                        setAnalysisLoading(true);
                      }}
                      disabled={!analysisHasData || analysisLoading}
                      className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                      {analysisLoading && (
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      )}
                      {analysisLoading
                        ? '分析中...'
                        : analysisResult
                          ? '重新分析'
                          : '生成分析'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}

      {/* FAB */}
      {!analysisOpen && (
        <button
          onClick={toggleAnalysis}
          className="fixed right-4 bottom-50 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-linear-to-br from-slate-900/90 to-slate-700/85 text-white shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl sm:right-6 sm:bottom-24 sm:h-14 sm:w-14 dark:border-gray-700/70 dark:from-gray-100 dark:to-gray-300 dark:text-gray-900"
          aria-label="打开 AI 分析"
          title="AI分析"
        >
          {analysisHasData && (
            <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 sm:top-0 sm:right-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 sm:h-3 sm:w-3" />
            </span>
          )}
          <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}
    </>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function LoadingState({ shimmerText }: { shimmerText: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{shimmerText}</p>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
      {message}
    </div>
  );
}

function ResultState({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-h-[50vh] min-h-16 overflow-y-auto text-gray-700 sm:max-h-[60vh] dark:text-gray-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function PlaceholderState() {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      点击「生成分析」，获取适合外出与钓鱼的天气建议。
    </p>
  );
}
