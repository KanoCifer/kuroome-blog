// Flat utils — 纯工具函数，由 index.ts 直接导出，无嵌套子目录。
// 基础设施层（request / auth / dayjs / websocket）已下沉至 lib/。

export { resolveCssColor } from './resolveColor';
export { playThemeTransition } from './themeTransition';
export { formatBytes, getFileExtension, processImage } from './handlePic';
export { compressImage } from './imageCompressor';
export type { CompressOptions } from './imageCompressor';
export { stripHtml } from './stripHtml';
export { getVisitorId } from './visitorId';
export { collectVisitorData, reportVisitorData } from './visitorTracker';
export {
  initVisitorWebSocket,
  reconnectWs,
  sendPing,
  connectionDelay,
  isConnected,
} from './visitorWs';
