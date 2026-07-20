import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/api/request', () => ({
  default: {
    post: vi.fn(),
  },
}));

import apiClient from '@/api/apiClient';
import { llmService } from '../llmService';

/**
 * Build a fetch mock that emits the given SSE chunks once, then signals done.
 * Mirrors the shape used in useSseStream.test.ts.
 */
function mockSseFetch(chunks: string[]) {
  let idx = 0;
  const mockReader = {
    read: vi.fn(async () => {
      if (idx < chunks.length) {
        const encoder = new TextEncoder();
        return { done: false, value: encoder.encode(chunks[idx++]) };
      }
      return { done: true, value: undefined };
    }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, body: { getReader: () => mockReader } })),
  );
}

describe('llmService', () => {
  let service: ReturnType<typeof llmService>;

  beforeEach(() => {
    service = llmService();
    vi.mocked(apiClient.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getCachedSummary', () => {
    it('POSTs to v2/llm/history/summary with article payload', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: { cached: true, summary: 'cached text' } },
      });

      const result = await service.getCachedSummary({
        article_content: '<p>Hello</p>',
        article_title: 'Title',
      });

      expect(apiClient.post).toHaveBeenCalledWith('v2/llm/history/summary', {
        article_content: '<p>Hello</p>',
        article_title: 'Title',
      });
      expect(result).toEqual({ cached: true, summary: 'cached text' });
    });

    it('returns cached=false when backend omits summary', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: { cached: false } },
      });

      const result = await service.getCachedSummary({
        article_content: 'no cache',
      });

      expect(result.cached).toBe(false);
      expect(result.summary).toBeUndefined();
    });
  });

  describe('getCachedChat', () => {
    it('POSTs to v2/llm/history/chat and unwraps messages', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          data: {
            cached: true,
            messages: [{ role: 'user', content: 'hi' }],
            session_id: 'sid-1',
          },
        },
      });

      const result = await service.getCachedChat({
        article_content: 'content',
        article_title: 'T',
      });

      expect(apiClient.post).toHaveBeenCalledWith('v2/llm/history/chat', {
        article_content: 'content',
        article_title: 'T',
      });
      expect(result.messages).toHaveLength(1);
      expect(result.session_id).toBe('sid-1');
    });
  });

  describe('streamSummary', () => {
    it('consumes SSE frames from /v2/llm/summary/stream with full payload', async () => {
      mockSseFetch([
        'data: {"content":"Hello"}\n\n',
        'data: {"content":" world"}\n\n',
        'data: [DONE]\n\n',
      ]);

      const onData = vi.fn();
      await service.streamSummary(
        { title: 't', content: 'c', model: 'Ring 2.6' },
        { onData },
      );

      expect(onData).toHaveBeenCalledTimes(2);
      expect(onData).toHaveBeenNthCalledWith(1, { content: 'Hello' });
      expect(onData).toHaveBeenNthCalledWith(2, { content: ' world' });
    });
  });

  describe('streamChat', () => {
    it('omits article fields when not provided', async () => {
      mockSseFetch(['data: {"content":"reply"}\n\n', 'data: [DONE]\n\n']);

      const onData = vi.fn();
      await service.streamChat(
        { message: 'hi', session_id: 'sid' },
        { onData },
      );

      // body sent through fetch should not include article_content/title
      const fetchMock = vi.mocked(globalThis.fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({ message: 'hi', session_id: 'sid' });
      expect(onData).toHaveBeenCalledWith({ content: 'reply' });
    });

    it('includes article fields on first message', async () => {
      mockSseFetch(['data: {"content":"reply"}\n\n', 'data: [DONE]\n\n']);

      const onData = vi.fn();
      await service.streamChat(
        {
          message: 'hi',
          session_id: 'sid',
          article_content: 'full text',
          article_title: 'Title',
        },
        { onData },
      );

      const fetchMock = vi.mocked(globalThis.fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({
        message: 'hi',
        session_id: 'sid',
        article_content: 'full text',
        article_title: 'Title',
      });
    });
  });

  describe('weatherAnalysis', () => {
    it('streams content chunks via onChunk callback', async () => {
      mockSseFetch([
        'data: {"content":"rainy"}\n\n',
        'data: {"content":" and windy"}\n\n',
        'data: [DONE]\n\n',
      ]);

      const onChunk = vi.fn();
      await service.weatherAnalysis(
        { weather_data: { location: [121, 31] } },
        onChunk,
      );

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(1, 'rainy');
      expect(onChunk).toHaveBeenNthCalledWith(2, ' and windy');
    });

    it('forwards AbortSignal to fetch', async () => {
      mockSseFetch(['data: {"content":"x"}\n\n', 'data: [DONE]\n\n']);

      const controller = new AbortController();
      await service.weatherAnalysis(
        { weather_data: {} },
        vi.fn(),
        controller.signal,
      );

      const fetchMock = vi.mocked(globalThis.fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal).toBe(controller.signal);
    });
  });
});
