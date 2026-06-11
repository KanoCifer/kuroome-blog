import { useShimmerTips } from '@/hooks/useShimmerTips';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import { useEffect, useMemo } from 'react';
import { useArticleSummary } from '../../hooks/useArticleSummary';

const marked = new Marked();
function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text) as string);
}

interface ArticleSummaryProps {
  title?: string;
  content: string;
}

export function ArticleSummaryCard({ title, content }: ArticleSummaryProps) {
  const {
    summary,
    loading,
    hasGenerated,
    generateSummary,
    selectedModel,
    setSelectedModel,
    modelOptions,
  } = useArticleSummary();

  const { tips: textShimmer, active: shimmerActive, setActive: setShimmerActive, reset: resetShimmer } = useShimmerTips();

  const renderedSummary = useMemo(
    () => (summary ? renderMarkdown(summary) : ''),
    [summary],
  );

  useEffect(() => {
    setShimmerActive(loading);
    if (!loading) resetShimmer();
  }, [loading, setShimmerActive, resetShimmer]);

  return (
    <section className={`summary-card border-border/60 bg-card/60 dark:bg-card/50 mx-4 mb-6 overflow-hidden rounded-2xl border shadow-sm transition-all${loading ? ' is-loading' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 dark:bg-primary/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 8V4H8" />
              <rect width={16} height={12} x={4} y={8} rx={2} />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
          <h3 className="text-foreground text-base font-semibold tracking-tight">
            AI 总结
            {shimmerActive && (
              <motion.span
                key={textShimmer[0]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-muted-foreground ml-2 text-sm"
              >
                {textShimmer[0]}
              </motion.span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="bg-muted/50 text-foreground border-border/60 cursor-pointer rounded-lg border px-2 py-1 text-xs outline-none transition-colors"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {modelOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            className="bg-primary text-primary-foreground disabled:bg-muted cursor-pointer rounded-full px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed"
            disabled={!content.trim() || loading}
            onClick={() => generateSummary({ title, content })}
          >
            {loading
              ? '总结中...'
              : hasGenerated
                ? '重新总结'
                : '生成总结'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-border/40 border-t px-5 pt-4 pb-5">
        {summary ? (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedSummary }}
          />
        ) : (
          <div className="flex items-center gap-3 py-3">
            <div className="bg-muted/50 dark:bg-muted/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">
              点击「生成总结」，快速提炼文章核心要点
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
