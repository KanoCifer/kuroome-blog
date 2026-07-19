import request from '@/api/request';
import { consumeSseStream } from '@/hooks/useSseStream';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CachedSummaryResponse {
  cached?: boolean;
  summary?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CachedChatResponse {
  cached?: boolean;
  messages?: ChatMessage[];
  session_id?: string;
}

export interface StreamSummaryPayload {
  title?: string;
  content: string;
  model?: string;
}

export interface StreamChatPayload {
  message: string;
  session_id: string;
  article_content?: string;
  article_title?: string;
}

export interface StreamFrame {
  content?: string;
  is_end?: boolean;
}

export interface SseHandlers {
  onData: (data: StreamFrame) => void;
  onDone?: () => void;
}

export interface LlmService {
  /** 静默查询后端缓存的总结 */
  getCachedSummary(payload: {
    article_content: string;
    article_title?: string;
  }): Promise<CachedSummaryResponse>;

  /** 静默查询历史对话 */
  getCachedChat(payload: {
    article_content: string;
    article_title?: string;
  }): Promise<CachedChatResponse>;

  /** 流式生成文章总结 */
  streamSummary(
    payload: StreamSummaryPayload,
    handlers: SseHandlers,
  ): Promise<void>;

  /** 流式对话 */
  streamChat(
    payload: StreamChatPayload,
    handlers: SseHandlers,
  ): Promise<void>;

  /** AI 天气分析（流式） */
  weatherAnalysis(
    payload: { weather_data: unknown },
    onChunk: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const extractData = <T>(res: { data: { data: T } }): T => res.data.data;

const apiBase = import.meta.env.VITE_API_BASE || '/';

// ── Service ──────────────────────────────────────────────────────────────────

export const llmService = (): LlmService => ({
  async getCachedSummary(payload) {
    const res = await request.post<{ data: CachedSummaryResponse }>(
      'v2/llm/history/summary',
      payload,
    );
    return extractData(res);
  },

  async getCachedChat(payload) {
    const res = await request.post<{ data: CachedChatResponse }>(
      'v2/llm/history/chat',
      payload,
    );
    return extractData(res);
  },

  async streamSummary(payload, handlers) {
    await consumeSseStream<StreamFrame>(
      {
        url: `${apiBase}/v2/llm/summary/stream`,
        body: {
          title: payload.title || '',
          content: payload.content,
          model: payload.model || '',
        },
      },
      handlers,
    );
  },

  async streamChat(payload, handlers) {
    const body: Record<string, string> = {
      message: payload.message,
      session_id: payload.session_id,
    };
    if (payload.article_content !== undefined) {
      body.article_content = payload.article_content;
    }
    if (payload.article_title !== undefined) {
      body.article_title = payload.article_title;
    }

    await consumeSseStream<StreamFrame>(
      {
        url: `${apiBase}/v2/llm/chat/stream`,
        body,
      },
      handlers,
    );
  },

  async weatherAnalysis(payload, onChunk, signal) {
    await consumeSseStream<StreamFrame>(
      {
        url: `${apiBase}/v2/llm/weather-analysis`,
        body: payload,
        signal,
      },
      {
        onData: (data) => {
          if (data.content) onChunk(data.content);
        },
      },
    );
  },
});