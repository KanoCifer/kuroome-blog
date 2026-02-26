import request from "@/request";
import { useStorage } from "@vueuse/core";
import { v4 } from "uuid";
// 生成 UUID v5
function generateVisitorId() {
  return v4();
}

// 使用 VueUse 的 useStorage 来持久化访客 ID
const visitorId = useStorage("visitorId", generateVisitorId());

export function getVisitorId() {
  return visitorId.value;
}

// 收集前端可获取的追踪信息
export function collectVisitorData() {
  const { navigator, screen, location } = window;
  return {
    visitor_id: getVisitorId(), // 访客唯一标识
    page_url: location.href, // 当前访问的完整URL
    page_path: location.pathname, // 页面路径
    referrer: document.referrer || "", // 访问来源（从哪个页面跳转过来）
    browser: navigator.userAgent, // 浏览器/设备信息
    screen_resolution: `${screen.width}x${screen.height}`, // 屏幕分辨率
    language: navigator.language || "", // 浏览器语言
  };
}

// 上报追踪数据到后端
export async function reportVisitorData() {
  try {
    const data = collectVisitorData();
    // 发送POST请求到FastAPI后端接口
    await request.post("/admin/track", data, {
      timeout: 5000, // 超时时间5秒
      // 跨域配置（如果前端和后端域名不同，需后端配合跨域）
      withCredentials: true,
    });
  } catch (error) {
    // 上报失败不影响主流程，仅控制台打印
    if (error instanceof Error) {
      console.warn("访客追踪数据上报失败:", error.message);
    }
  }
}
