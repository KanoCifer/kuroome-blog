import { useWebSocket } from "@/composables/useWebSocket";
import { useVisitorCountStore } from "@/stores/visitorCount";
import { getVisitorId } from "@/utils/visitorTracker";
import type { Pinia } from "pinia";

let initialized = false;
let wsDisconnect: (() => void) | null = null;
let wsConnect: (() => void) | null = null;

function buildWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE || "/api";
  if (apiBase.startsWith("http")) {
    return apiBase.replace(/^http/, "ws") + "/v2/publicv2/ws";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  console.log("WebSocket URL:", `${protocol}//${host}${apiBase}/v2/publicv2/ws`);
  return `${protocol}//${host}${apiBase}/v2/publicv2/ws`;
}

export function initVisitorWebSocket(pinia: Pinia) {
  if (initialized) return;
  initialized = true;

  const store = useVisitorCountStore(pinia);

  const ws = useWebSocket({
    url: buildWsUrl(),
    visitorId: getVisitorId(),
    onCount: (count: number) => {
      store.setCount(count);
    },
    immediate: true,
  });

  wsDisconnect = ws.disconnect;
  wsConnect = ws.connect;
}

/** 断开并重新连接 WS，用于登录/登出后携带更新后的 cookie */
export function reconnectWs() {
  if (wsDisconnect && wsConnect) {
    wsDisconnect();
    wsConnect();
  }
}
