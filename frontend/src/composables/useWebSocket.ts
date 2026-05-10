import { onMounted, onUnmounted, ref } from "vue";

interface UseWebSocketOptions {
  url: string;
  visitorId?: string | null;
  onCount?: (count: number) => void;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  pingIntervalMs?: number;
  /** When true, connect immediately instead of deferring to onMounted.
   *  Use for module-level singleton WebSockets called outside Vue setup. */
  immediate?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onCount,
    visitorId,
    reconnectBaseMs = 1000,
    reconnectMaxMs = 30000,
    pingIntervalMs = 30000,
    immediate = false,
  } = options;

  const isConnected = ref(false);
  const reconnectAttempt = ref(0);
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect() {
    const delay = Math.min(reconnectBaseMs * Math.pow(2, reconnectAttempt.value), reconnectMaxMs);
    reconnectTimer = setTimeout(connect, delay);
    reconnectAttempt.value++;
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, pingIntervalMs);
  }

  function stopPing() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function sendVisitorId(visitorId: string | null) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "visitor_id", visitor_id: visitorId }));
    }
  }

  function connect() {
    stopPing();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.close();
    }

    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      isConnected.value = true;
      reconnectAttempt.value = 0;
      sendVisitorId(visitorId || null);
      startPing();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "count" && onCount && typeof data.count === "number") {
          onCount(data.count);
        }
      } catch {
        // ignore non-JSON or malformed messages
      }
    };

    ws.onclose = (event) => {
      isConnected.value = false;
      stopPing();
      if (event.code !== 1000) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function disconnect() {
    stopPing();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close(1000);
      ws = null;
    }
    isConnected.value = false;
  }

  function send(data: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  const handleVisibility = () => {
    if (document.visibilityState === "visible" && !isConnected.value) {
      reconnectAttempt.value = 0;
      connect();
    }
  };

  const handleOnline = () => {
    reconnectAttempt.value = 0;
    connect();
  };

  if (immediate) {
    connect();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
  } else {
    onMounted(() => {
      connect();
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("online", handleOnline);
    });

    onUnmounted(() => {
      disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    });
  }

  return { isConnected, send, disconnect, connect };
}
