import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, CloudOff, X } from 'lucide-react';
import { marked } from 'marked';
import { useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import { useAnalysisContext } from '../contexts/AnalysisContext';

const AI_MODELS = [
  { id: 'Ling-2.6-1T', name: 'Ling 2.6' },
  { id: 'Ling-2.6-flash', name: 'Ling 2.6 Flash' },
  { id: 'Ring-2.5-1T', name: 'Ring 2.5' },
];

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface AIAnalysisWidgetProps {
  onGenerate: (modelId: string) => void;
  /**
   * 嵌入模式：去掉 fixed 定位与 portal，改为流式布局。
   * 与 hideFab 配合，可放进 drawer / sheet 等容器内。
   */
  embedded?: boolean;
  /**
   * 隐藏 FAB 入口（由父组件 header 或 drawer 触发开关）。
   */
  hideFab?: boolean;
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
    console.error('Error rendering markdown content:', content);
    return content;
  }
}

export function AIAnalysisWidget({
  onGenerate,
  embedded = false,
  hideFab = false,
}: AIAnalysisWidgetProps) {
  const {
    analysisOpen,
    analysisLoading,
    analysisError,
    analysisResult,
    analysisHasData,
    toggleAnalysis,
    closeAnalysis,
    setAnalysisLoading,
    abortAnalysis,
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

  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);

  const statusLabel = (() => {
    if (analysisLoading) return '分析中';
    if (analysisError) return '分析失败';
    if (analysisResult) return '已生成';
    return '待生成';
  })();

  const statusClass = (() => {
    if (analysisLoading) return 'bg-primary/15 text-primary';
    if (analysisError) return 'bg-destructive/15 text-destructive';
    if (analysisResult) return 'bg-success/15 text-success';
    return 'bg-muted/10 text-muted-foreground';
  })();

  // 内嵌模式：去掉 fixed + portal，改为流式容器
  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span
            className={`${statusClass} rounded-full px-2.5 py-0.5 text-xs font-medium`}
          >
            {statusLabel}
          </span>
          {analysisOpen && (
            <button
              onClick={closeAnalysis}
              className="text-muted-foreground hover:bg-muted rounded-full p-1"
              aria-label="关闭分析"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
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

          {!analysisLoading && (
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="border-border bg-secondary text-card-foreground flex-1 rounded-lg border px-3 py-1.5 text-xs"
              >
                {AI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {analysisLoading ? (
            <button
              onClick={() => {
                abortAnalysis();
              }}
              className="bg-destructive hover:bg-destructive/90 relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <rect
                  x="6"
                  y="6"
                  width="12"
                  height="12"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
              取消分析
            </button>
          ) : (
            <button
              onClick={() => {
                onGenerate(selectedModel);
                setAnalysisLoading(true);
              }}
              disabled={!analysisHasData}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition disabled:cursor-not-allowed"
            >
              {analysisResult ? '重新分析' : '生成分析'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 弹层模式（默认）：FAB + portal 居中浮层
  return (
    <>
      {createPortal(
        <div className="fixed right-1/2 bottom-24 z-50 flex translate-x-1/2 flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {analysisOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="group border-border/50 from-card/80 to-card/40 relative mb-3 w-[90vw] max-w-sm overflow-hidden rounded-3xl border bg-linear-to-br shadow-2xl backdrop-blur-sm"
              >
                <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-linear-to-br from-indigo-300/30 to-sky-500/20 blur-2xl transition-transform duration-700 group-hover:scale-110" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-linear-to-tr from-emerald-300/20 to-cyan-400/10 blur-2xl transition-transform duration-700 group-hover:scale-110" />

                <div className="relative z-10">
                  <div className="border-border/70 flex items-start justify-between gap-3 border-b px-4 py-3">
                    <div>
                      <h3 className="text-foreground text-sm font-bold tracking-tight">
                        AI 天气分析
                      </h3>
                      <p className="text-muted-foreground mt-0.5 text-xs">
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
                        className="text-muted-foreground hover:bg-muted rounded-full p-1"
                        aria-label="关闭分析"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

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

                    {!analysisLoading && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="border-border bg-secondary text-card-foreground flex-1 rounded-lg border px-3 py-1.5 text-xs"
                        >
                          {AI_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {analysisLoading ? (
                      <button
                        onClick={() => {
                          abortAnalysis();
                        }}
                        className="bg-destructive hover:bg-destructive/90 relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="6"
                            y="6"
                            width="12"
                            height="12"
                            rx="1"
                            fill="currentColor"
                          />
                        </svg>
                        取消分析
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onGenerate(selectedModel);
                          setAnalysisLoading(true);
                        }}
                        disabled={!analysisHasData}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition disabled:cursor-not-allowed"
                      >
                        {analysisResult ? '重新分析' : '生成分析'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}

      {!hideFab && !analysisOpen && (
        <button
          onClick={toggleAnalysis}
          className="border-primary-foreground/50 from-primary/90 to-primary/85 text-primary-foreground fixed right-4 bottom-50 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-linear-to-br shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl sm:right-6 sm:bottom-24 sm:h-14 sm:w-14"
          aria-label="打开 AI 分析"
          title="AI分析"
        >
          {analysisHasData && (
            <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 sm:top-0 sm:right-0">
              <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
              <span className="bg-success relative inline-flex h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3" />
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
      <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
    </div>
  );
}

function LoadingState({ shimmerText }: { shimmerText: string }) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{shimmerText}</p>
      <div className="space-y-2">
        <div className="bg-secondary/70 h-3 w-full animate-pulse rounded" />
        <div className="bg-secondary/70 h-3 w-5/6 animate-pulse rounded" />
        <div className="bg-secondary/70 h-3 w-2/3 animate-pulse rounded" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
      {message}
    </div>
  );
}

function ResultState({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm dark:prose-invert text-card-foreground max-h-[50vh] min-h-16 overflow-y-auto sm:max-h-[60vh]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function PlaceholderState() {
  return (
    <p className="text-muted-foreground text-sm">
      点击「生成分析」，获取适合外出与钓鱼的天气建议。
    </p>
  );
}
