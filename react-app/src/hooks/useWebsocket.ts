import { useCallback, useEffect, useRef } from 'react';

interface UseWebSocketOptions {
  url: string;
  visitorId?: string | null;
  onCount?: (count: number) => void;
  onConnectionDelay?: (ms: number) => void;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  pingIntervalMs?: number;
}

export function useWebsocket(options: UseWebSocketOptions) {
  const {
    url,
    visitorId,
    onCount,
    onConnectionDelay,
    reconnectBaseMs = 1000,
    reconnectMaxMs = 30000,
    pingIntervalMs = 30000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingStartTimeRef = useRef(0);

  // Stable callbacks — refs for values that change but shouldn't trigger reconnect
  const onCountRef = useRef(onCount);
  const onConnectionDelayRef = useRef(onConnectionDelay);
  const visitorIdRef = useRef(visitorId);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    stopPing();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    let startTime: number;

    try {
      startTime = performance.now();
      wsRef.current = new WebSocket(url);
    } catch {
      // Invalid URL or environment — schedule reconnect
      const delay = Math.min(
        reconnectBaseMs * Math.pow(2, reconnectAttemptRef.current),
        reconnectMaxMs,
      );
      reconnectTimerRef.current = setTimeout(connect, delay);
      reconnectAttemptRef.current++;
      return;
    }

    const ws = wsRef.current;

    ws.onopen = () => {
      isConnectedRef.current = true;
      reconnectAttemptRef.current = 0;
      onConnectionDelayRef.current?.(performance.now() - startTime);

      if (visitorIdRef.current) {
        ws.send(
          JSON.stringify({
            type: 'visitor_id',
            visitor_id: visitorIdRef.current,
          }),
        );
      }

      // Start ping loop
      stopPing();
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          pingStartTimeRef.current = performance.now();
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, pingIntervalMs);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'count' &&
          onCountRef.current &&
          typeof data.count === 'number'
        ) {
          onCountRef.current(data.count);
        } else if (data.type === 'pong') {
          onConnectionDelayRef.current?.(
            performance.now() - pingStartTimeRef.current,
          );
        }
      } catch {
        // ignore non-JSON or malformed messages
      }
    };

    ws.onclose = (event) => {
      isConnectedRef.current = false;
      stopPing();
      if (event.code !== 1000) {
        const delay = Math.min(
          reconnectBaseMs * Math.pow(2, reconnectAttemptRef.current),
          reconnectMaxMs,
        );
        reconnectTimerRef.current = setTimeout(connect, delay);
        reconnectAttemptRef.current++;
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, reconnectBaseMs, reconnectMaxMs, pingIntervalMs, stopPing]);

  const disconnect = useCallback(() => {
    stopPing();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    isConnectedRef.current = false;
  }, [stopPing]);

  useEffect(() => {
    connect();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isConnectedRef.current) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    };

    const handleOnline = () => {
      reconnectAttemptRef.current = 0;
      connect();
    };

    const handleBeforeUnload = () => {
      disconnect();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnect();
    };
  }, [connect, disconnect]);

  return { isConnected: isConnectedRef.current };
}
