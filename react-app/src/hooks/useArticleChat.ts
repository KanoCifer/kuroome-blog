import { useNotificationStore } from '@/stores/notificationState';
import { useCallback, useRef, useState } from 'react';
import { llmService } from '@/lib';
import type { ArticleContext } from './useArticleSummary';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function generateSessionId() {
  return `summary_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 封装"AI 对话"的状态：会话管理、消息发送、流式追加。
 */
export function useArticleChat(ctx: ArticleContext) {
  const notifier = useNotificationStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const canChat = chatInput.trim().length > 0 && !loading;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, []);

  /** 静默查询历史对话，命中则恢复上下文 */
  const loadHistory = useCallback(async () => {
    if (!ctx.content) return;
    const pureContent = ctx.content.replaceAll(/<[^>]+>/g, '').trim();
    if (!pureContent) return;
    try {
      const data = await llmService().getCachedChat({
        article_content: pureContent,
        article_title: ctx.title,
      });
      if (data.cached && data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        if (data.session_id) setSessionId(data.session_id);
      }
    } catch {
      // 静默忽略
    }
  }, [ctx.content, ctx.title]);

  /** 切换到对话模式：尝试加载历史，没有则创建新会话 */
  const enterChat = useCallback(async () => {
    if (!sessionId) {
      await loadHistory();
      setSessionId((prev) => prev || generateSessionId());
    }
  }, [sessionId, loadHistory]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(generateSessionId());
  }, []);

  const send = useCallback(async () => {
    if (!canChat) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    const currentSessionId = sessionId || generateSessionId();
    if (!sessionId) setSessionId(currentSessionId);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ]);
    scrollToBottom();

    setLoading(true);
    setErrorMessage('');

    const isFirstMessage =
      messages.filter((m) => m.role === 'user').length === 0;

    try {
      await llmService().streamChat(
        {
          message: userMessage,
          session_id: currentSessionId,
          ...(isFirstMessage
            ? {
                article_content: ctx.content,
                article_title: ctx.title,
              }
            : {}),
        },
        {
          onData: (data) => {
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.content,
                  };
                }
                return updated;
              });
              scrollToBottom();
            }
          },
        },
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : '对话失败，请稍后重试';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: `[ERROR] ${msg}`,
          };
        }
        return updated;
      });
      setErrorMessage(msg);
      notifier.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    canChat,
    chatInput,
    ctx.content,
    ctx.title,
    messages,
    notifier,
    scrollToBottom,
    sessionId,
  ]);

  const onInputKeydown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  return {
    messages,
    chatInput,
    setChatInput,
    loading,
    errorMessage,
    canChat,
    containerRef,
    enterChat,
    clearChat,
    send,
    onInputKeydown,
  };
}
