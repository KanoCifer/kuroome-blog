import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useState } from 'react';
import { consumeSseStream } from './useSseStream';

export interface ArticleContext {
  title?: string;
  content: string;
}

export interface SummaryState {
  summary: string;
  loading: boolean;
  errorMessage: string;
  hasGenerated: boolean;
}

/** 可选模型列表 */
export const MODEL_OPTIONS = [
  { label: 'Ring 2.6', value: 'Ring 2.6' },
  { label: 'Ling 2.6', value: 'Ling 2.6' },
] as const;

/**
 * 封装"AI 文章总结"的状态：生成、流式拼接、错误提示。
 * 组件只需绑定 loading/summary/hasGenerated/errorMessage。
 */
export function useArticleSummary() {
  const notifier = useNotificationStore();
  const [state, setState] = useState<SummaryState>({
    summary: '',
    loading: false,
    errorMessage: '',
    hasGenerated: false,
  });
  const [selectedModel, setSelectedModel] = useState<string>(
    MODEL_OPTIONS[0].value,
  );

  const apiBase = import.meta.env.VITE_API_BASE || '/';

  const generateSummary = useCallback(
    async ({ title, content }: ArticleContext) => {
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

      try {
        await consumeSseStream<{ content?: string }>(
          {
            url: `${apiBase}/v2/llm/summary/stream`,
            body: {
              title: title || '',
              content: pureContent,
              model: selectedModel,
            },
          },
          {
            onData: (data) => {
              if (data.content) {
                setState((prev) => ({
                  ...prev,
                  summary: prev.summary + data.content,
                }));
              }
            },
          },
        );

        setState((prev) => ({ ...prev, hasGenerated: true, loading: false }));
      } catch {
        const errorMessage = 'AI总结失败，请稍后重试';
        notifier.error(errorMessage);
        setState((prev) => ({ ...prev, errorMessage, loading: false }));
      }
    },
    [apiBase, notifier, selectedModel],
  );

  return {
    ...state,
    generateSummary,
    selectedModel,
    setSelectedModel,
    modelOptions: MODEL_OPTIONS,
  };
}
