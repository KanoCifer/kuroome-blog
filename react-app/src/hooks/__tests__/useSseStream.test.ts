import { describe, it, expect, vi } from 'vitest';
import { consumeSseStream } from '../useSseStream';

describe('consumeSseStream', () => {
  it('解析 SSE 数据帧并调用 onData', async () => {
    const chunks = [
      'data: {"content":"Hello"}\n\n',
      'data: {"content":" World"}\n\n',
    ];
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
      vi.fn(async () => ({
        ok: true,
        body: { getReader: () => mockReader },
      })),
    );

    const onData = vi.fn();
    const onDone = vi.fn();

    await consumeSseStream(
      { url: '/api/test', body: { prompt: 'hi' } },
      { onData, onDone },
    );

    expect(onData).toHaveBeenCalledTimes(2);
    expect.onData).toHaveBeenNthCalledWith(1, { content: 'Hello' });
    expect(onData).toHaveBeenNthCalledWith(2, { content: ' World' });
    expect(onDone).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('收到 [DONE] 调用 onDone', async () => {
    const chunks = ['data: {"content":"Hi"}\n\n', 'data: [DONE]\n\n'];
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
      vi.fn(async () => ({
        ok: true,
        body: { getReader: () => mockReader },
      })),
    );

    const onData = vi.fn();
    const onDone = vi.fn();

    await consumeSseStream(
      { url: '/api/test', body: {} },
      { onData, onDone },
    );

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('HTTP 错误时抛出异常', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 })),
    );

    await expect(
      consumeSseStream(
        { url: '/api/test', body: {} },
        { onData: vi.fn() },
      ),
    ).rejects.toThrow('网络连接失败，请重试');

    vi.unstubAllGlobals();
  });

  it('空响应体时抛出异常', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, body: null })),
    );

    await expect(
      consumeSseStream(
        { url: '/api/test', body: {} },
        { onData: vi.fn() },
      ),
    ).rejects.toThrow('无法读取响应流');

    vi.unstubAllGlobals();
  });
});
