export interface SseHandlers<T = unknown> {
  /** Called for each parsed JSON data frame (after `[DONE]` sentinel is filtered). */
  onData: (data: T) => void;
  /** Called when the stream emits `[DONE]` or `{is_end: true}`. */
  onDone?: () => void;
}

export interface SseRequestOptions {
  url: string;
  body: unknown;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

/**
 * 解析一段 SSE 文本块，返回 {events, rest}，rest 留作下次拼接。
 * 跳过空行、非 data: 开头、解析失败的行。
 */
export function parseSseChunk(buffer: string): { events: string[]; rest: string } {
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
 * POST 一个 JSON body 并以 SSE 流的形式消费响应。
 * 收到每个 data 帧时调用 onData，遇到 [DONE] 或 is_end=true 时调用 onDone。
 * 统一处理 reader / decoder / buffer，调用方只需关心业务逻辑。
 */
export async function consumeSseStream<T = { content?: string; is_end?: boolean }>(
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
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        const data = JSON.parse(jsonStr) as T;
        handlers.onData(data);
        if ((data as { is_end?: boolean }).is_end) {
          finished = true;
          break;
        }
      } catch {
        // 忽略单帧解析错误，继续消费后续帧
      }
    }
    if (finished) break;
  }

  handlers.onDone?.();
}
