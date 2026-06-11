import { useNotificationStore } from '@/stores/notificationState';
import { motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';

interface ArticleSummaryProps {
  title?: string;
  content: string;
}

interface SummaryState {
  summary: string;
  loading: boolean;
  errorMessage: string;
  hasGenerated: boolean;
}

function useArticleSummary() {
  const notifier = useNotificationStore();
  const [state, setState] = useState<SummaryState>({
    summary: '',
    loading: false,
    errorMessage: '',
    hasGenerated: false,
  });
  const texts = useMemo(
    () => [
      '正在分析文章结构...',
      '正在提取关键信息...',
      '正在生成总结内容...',
      '正在优化总结表达...',
    ],
    [],
  );
  const [textShimmer, setTextShimmer] = useState(texts[0]);

  const apiBase = import.meta.env.VITE_API_BASE || '/api';

  const generateSummary = useCallback(
    async ({ title, content }: ArticleSummaryProps) => {
      const pureContent = content.trim();
      if (!pureContent) {
        notifier.error('文章内容为空，无法总结');
        return;
      }

      setState({
        summary: '',
        loading: true,
        errorMessage: '',
        hasGenerated: false,
      });

      const interval = setInterval(() => {
        setTextShimmer((prev) => {
          const currentIndex = texts.indexOf(prev);
          const nextIndex = (currentIndex + 1) % texts.length;
          return texts[nextIndex];
        });
      }, 2000);

      try {
        const response = await fetch(`${apiBase}/v2/llm/summary/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: title || '',
            content: pureContent,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        let hasGenerated = false;
        let summary = '';

        while (!hasGenerated) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim() || !part.startsWith('data:')) continue;
            const jsonStr = part.replace(/^data:\s*/, '').trim();
            if (jsonStr === '[DONE]') {
              hasGenerated = true;
              break;
            }
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                summary += data.content;
                setState((prev) => ({ ...prev, summary }));
              }
              if (data.is_end) hasGenerated = true;
            } catch {
              // 忽略解析错误，继续处理下一部分
            }
          }
        }

        setState((prev) => ({ ...prev, hasGenerated: true, loading: false }));
      } catch {
        const errorMessage = 'AI总结失败，请稍后重试';
        notifier.error(errorMessage);
        setState((prev) => ({ ...prev, errorMessage, loading: false }));
      } finally {
        setTextShimmer('');
        clearInterval(interval);
      }
    },
    [notifier, texts],
  );

  return { ...state, generateSummary, textShimmer };
}

export function ArticleSummaryCard({ title, content }: ArticleSummaryProps) {
  const { summary, loading, hasGenerated, generateSummary, textShimmer } =
    useArticleSummary();

  return (
    <section className="border-primary/20 bg-primary/5 mx-4 mb-6 overflow-hidden rounded-2xl border p-5 shadow-[0_1px_20px_rgba(105,163,255,0.253)] transition-all">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-primary font-semibold">
          AI 文章总结
          {loading && (
            <motion.span
              key={textShimmer}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="animate-shimmer ml-2 text-xs"
            >
              {textShimmer}
            </motion.span>
          )}
        </h3>

        <button
          className="bg-primary text-primary-foreground disabled:bg-muted cursor-pointer rounded-full px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed"
          disabled={!content.trim() || loading}
          onClick={() => generateSummary({ title, content })}
        >
          {loading ? '生成中...' : hasGenerated ? '重新总结' : '开始总结'}
        </button>
      </div>

      <article className="border-primary/30 bg-primary/10 text-foreground rounded-2xl border p-4 text-sm whitespace-pre-line">
        {summary || (loading ? '正在生成总结...' : '点击按钮生成文章总结')}
      </article>
    </section>
  );
}
