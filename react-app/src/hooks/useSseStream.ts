export interface SseHandlers<T = unknown> {
  onData: (data: T) => void;
  onDone?: () => void;
}

export interface SseRequestOptions {
  url: string;
  body: unknown;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

function parseSseChunk(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() || '';
  const events: string[] = [];
  for (const part of parts) {
    if (!part.trim() || !part.startsWith('data:')) continue;
    events.push(part.replace(/^data:\s*/, '').trim());
  }
  return { events, rest };
}

/**
 * POST JSON body 并以 SSE 流消费响应。
 * 收到每个 data 帧调用 onData，遇到 [DONE] 调用 onDone。
 */
export async function consumeSseStream<T = { content?: string }>(
  options: SseRequestOptions,
  handlers: SseHandlers<T>,
): Promise<void> {
  const response = await fetch(options.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: options.credentials ?? 'include',
    body: JSON.stringify(options.body),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error('网络连接失败，请重试');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buffer);
    buffer = rest;

    let finished = false;
    for (const jsonStr of events) {
      if (jsonStr === '[DONE]') {
        finished = true;
        break;
      }
      try {
        handlers.onData(JSON.parse(jsonStr) as T);
      } catch {
        // 忽略单帧解析错误
      }
    }
    if (finished) break;
  }

  handlers.onDone?.();
}
