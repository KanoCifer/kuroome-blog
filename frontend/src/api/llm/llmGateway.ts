import request from '@/api/shared/request';
import {
  consumeSseStream,
  type SseHandlers,
} from '@/composables/article/useSseStream';

const API_BASE = import.meta.env.VITE_API_BASE || '/';

export interface CachedLlmPayload {
  article_content: string;
  article_title?: string;
}

export interface CachedSummaryResponse {
  cached?: boolean;
  summary?: string;
}

export interface CachedChatResponse {
  cached?: boolean;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  session_id?: string;
}

export interface StreamSummaryBody {
  title: string;
  content: string;
  model: string;
}

export interface StreamChatBody {
  message: string;
  session_id: string;
  article_content?: string;
  article_title?: string;
}

export interface WeatherAnalysisBody {
  weather_data: unknown;
  model_id: string;
}

export interface LlmStreamFrame {
  content?: string;
  is_end?: boolean;
}

/**
 * 适配 `/v2/llm/*` 端点的 gateway port。
 *
 * 沿用 `rssGateway` / `mapGateway` 模式：JSON 端点走 `@/api/shared/request`(axios)，
 * SSE 端点走 `consumeSseStream`(raw fetch)。所有调用方通过该 port 访问 LLM，
 * 不再直接持有 fetch。
 */
export interface LlmGateway {
  /** 静默查询后端缓存的 AI 总结。未登录也会发起，命中即返回。 */
  getCachedSummary(payload: CachedLlmPayload): Promise<CachedSummaryResponse>;
  /** 静默查询后端缓存的 AI 对话历史。 */
  getCachedChat(payload: CachedLlmPayload): Promise<CachedChatResponse>;
  /** 流式生成 AI 文章总结。 */
  streamSummary(
    body: StreamSummaryBody,
    handlers: SseHandlers<LlmStreamFrame>,
    signal?: AbortSignal,
  ): Promise<void>;
  /** 流式 AI 对话。 */
  streamChat(
    body: StreamChatBody,
    handlers: SseHandlers<LlmStreamFrame>,
    signal?: AbortSignal,
  ): Promise<void>;
  /** 流式生成天气/钓鱼 AI 分析。 */
  weatherAnalysis(
    body: WeatherAnalysisBody,
    handlers: SseHandlers<LlmStreamFrame>,
    signal?: AbortSignal,
  ): Promise<void>;
}

export const llmGateway: LlmGateway = {
  async getCachedSummary(payload) {
    const res = await request.post<{ data: CachedSummaryResponse }>(
      'v2/llm/history/summary',
      payload,
    );
    return res.data.data;
  },

  async getCachedChat(payload) {
    const res = await request.post<{ data: CachedChatResponse }>(
      'v2/llm/history/chat',
      payload,
    );
    return res.data.data;
  },

  async streamSummary(body, handlers, signal) {
    await consumeSseStream<LlmStreamFrame>(
      {
        url: `${API_BASE}/v2/llm/summary/stream`,
        body,
        ...(signal ? { signal } : {}),
      },
      handlers,
    );
  },

  async streamChat(body, handlers, signal) {
    await consumeSseStream<LlmStreamFrame>(
      {
        url: `${API_BASE}/v2/llm/chat/stream`,
        body,
        ...(signal ? { signal } : {}),
      },
      handlers,
    );
  },

  async weatherAnalysis(body, handlers, signal) {
    await consumeSseStream<LlmStreamFrame>(
      {
        url: `${API_BASE}/v2/llm/weather-analysis`,
        body,
        ...(signal ? { signal } : {}),
      },
      handlers,
    );
  },
};