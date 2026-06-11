import { computed, nextTick, ref } from 'vue';
import { consumeSseStream } from './useSseStream';

export interface ArticleContext {
  title?: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CachedChatResponse {
  cached?: boolean;
  messages?: ChatMessage[];
  session_id?: string;
}

interface ChatStreamFrame {
  content?: string;
  is_end?: boolean;
}

function generateSessionId() {
  return `summary_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 封装"AI 对话"的状态：历史加载、会话管理、消息发送、流式追加、自动滚屏。
 *
 * 用法：
 *   const chat = useArticleChat(ctx, apiBase);
 *   <div :ref="chat.bindContainer" />
 *   await chat.send(notifier.error)
 */
export function useArticleChat(ctx: ArticleContext, apiBase: string) {
  const messages = ref<ChatMessage[]>([]);
  const chatInput = ref('');
  const sessionId = ref('');
  const loading = ref(false);
  const errorMessage = ref('');

  // 容器引用：通过 bindContainer 绑定到模板，scrollToBottom 内部读取
  let containerEl: HTMLElement | null = null;
  const bindContainer = (el: Element | { $el?: Element } | null) => {
    if (el && '$el' in el && el.$el) {
      containerEl = el.$el as HTMLElement;
    } else {
      containerEl = (el as HTMLElement | null) ?? null;
    }
  };

  const canChat = computed(
    () => chatInput.value.trim().length > 0 && !loading.value,
  );

  async function scrollToBottom() {
    await nextTick();
    if (containerEl) {
      containerEl.scrollTop = containerEl.scrollHeight;
    }
  }

  /** 静默查询历史对话，命中则恢复上下文。未登录也会发起，命中即恢复。 */
  async function loadHistory() {
    if (!ctx.content) return;
    const pureContent = ctx.content.replaceAll(/<[^>]+>/g, '').trim();
    if (!pureContent) return;
    try {
      const res = await fetch(`${apiBase}/v1/agent/history/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          article_content: pureContent,
          article_title: ctx.title || undefined,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as CachedChatResponse;
      if (data.cached && data.messages && data.messages.length > 0) {
        messages.value = data.messages;
        if (data.session_id) sessionId.value = data.session_id;
      }
    } catch {
      // 历史加载失败静默忽略
    }
  }

  /** 切换到对话模式：尝试加载历史，没有则创建新会话。 */
  async function enterChat() {
    if (!sessionId.value) {
      await loadHistory();
      if (!sessionId.value) sessionId.value = generateSessionId();
    }
  }

  function clearChat() {
    messages.value = [];
    sessionId.value = generateSessionId();
  }

  function onInputKeydown(e: KeyboardEvent, send: () => Promise<void>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  async function send(notifyError: (msg: string) => void) {
    if (!canChat.value) return;

    const userMessage = chatInput.value.trim();
    chatInput.value = '';

    if (!sessionId.value) sessionId.value = generateSessionId();

    messages.value.push({ role: 'user', content: userMessage });
    messages.value.push({ role: 'assistant', content: '' });
    await scrollToBottom();

    loading.value = true;
    errorMessage.value = '';

    const assistantIdx = messages.value.length - 1;
    const isFirstMessage =
      messages.value.filter((m) => m.role === 'user').length === 1;

    const body: Record<string, string> = {
      message: userMessage,
      session_id: sessionId.value,
    };
    if (isFirstMessage) {
      body.article_content = ctx.content;
      body.article_title = ctx.title || '';
    }

    try {
      await consumeSseStream<ChatStreamFrame>(
        { url: `${apiBase}/v1/agent/chat/stream`, body },
        {
          onData: async (data) => {
            if (data.content) {
              messages.value[assistantIdx].content += data.content;
              await scrollToBottom();
            }
          },
        },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '对话失败，请稍后重试';
      messages.value[assistantIdx].content = `[ERROR] ${msg}`;
      notifyError(msg);
    } finally {
      loading.value = false;
    }
  }

  return {
    messages,
    chatInput,
    sessionId,
    loading,
    errorMessage,
    canChat,
    bindContainer,
    enterChat,
    clearChat,
    send,
    onInputKeydown,
  };
}
