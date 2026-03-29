import request, { fetchAndStoreCSRF } from "@/request";
import router from "@/router";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";
import { isAxiosError } from "axios";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
// 用户信息类型定义
export interface UserInfo {
  id: number;
  username: string;
  is_admin: boolean;
  name?: string;
  email?: string;
  photo?: string;
  gender?: string | null;
  mobile?: string | null;
  has_passkey?: boolean;
  github_bound?: boolean;
}

// sessionStorage key
const USER_INFO_KEY = "cached_user_info";

// 定义认证状态管理
export const useAuthStore = defineStore("auth", () => {
  // ---------------------- 状态（State） ----------------------
  const user = ref<UserInfo | null>(null);
  const loading = ref(false);
  const isHydrated = ref(false); // 是否初始化过
  const refreshToken = useStorage("refresh_token", "");
  let heartbeatTimer: number | null = null; // 心跳定时器

  const notifier = useNotificationStore(); // 通知提示

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => !!user.value?.is_admin);

  // ---------------------- 辅助方法 ----------------------

  // 从 sessionStorage 读取缓存的用户信息
  function getCachedUser(): UserInfo | null {
    try {
      const cached = sessionStorage.getItem(USER_INFO_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  // 缓存用户信息到 sessionStorage
  function cacheUser(userInfo: UserInfo | null): void {
    if (userInfo) {
      sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    } else {
      sessionStorage.removeItem(USER_INFO_KEY);
    }
  }

  const saveRefreshToken = (token: string) => {
    refreshToken.value = token;
  };

  function getRefreshToken() {
    return refreshToken.value;
  }

  // 启动心跳上报
  function startHeartbeat() {
    // 先停止已有定时器
    stopHeartbeat();

    // 每60秒上报一次心跳
    heartbeatTimer = window.setInterval(async () => {
      if (user.value) {
        try {
          await request.post("/auth/heartbeat");
        } catch (err) {
          console.error("心跳上报失败:", err);
        }
      } else {
        stopHeartbeat();
      }
    }, 60000);
  }

  // 停止心跳上报
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // ---------------------- 方法（Actions） ----------------------

  // 2. 获取当前登录用户信息
  async function fetchUser(
    options: { silentOnUnauthenticated?: boolean } = {},
  ) {
    loading.value = true;
    try {
      const res = await request.get("/auth/me");
      const userData = res.data.data || null;
      user.value = userData;
      cacheUser(userData); // 缓存到 sessionStorage
      // 启动心跳上报
      startHeartbeat();
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const isUnauthenticated = status === 401;
      if (!(options.silentOnUnauthenticated && isUnauthenticated)) {
        notifier.error("登陆过期，请重新登录！");
      }
      user.value = null;
      cacheUser(null);
    } finally {
      loading.value = false;
    }
  }

  async function hydrateAuth() {
    if (isHydrated.value) return; // 避免重复初始化

    try {
      // 1. 先尝试从缓存读取
      const cachedUser = getCachedUser();
      if (cachedUser) {
        user.value = cachedUser;
        isHydrated.value = true;
        // 启动心跳上报
        startHeartbeat();
        return;
      }

      // 2. 缓存不存在，从后端获取
      await fetchUser({ silentOnUnauthenticated: true });
      isHydrated.value = true;
    } catch {
      notifier.error("认证初始化失败");
      user.value = null;
      cacheUser(null);
      isHydrated.value = true;
    }
  }

  async function initCSRF() {
    await fetchAndStoreCSRF();
  }

  // 4. 登录
  async function login(username: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const res = await request.post("/auth/login", {
        username: username,
        password: password,
        remember_me: rememberMe,
      });
      // 登录成功后获取 CSRF Token
      initCSRF();
      // 登录响应中已包含用户信息，直接使用并缓存
      const userData = res.data.data || null;
      user.value = userData;
      cacheUser(userData);

      saveRefreshToken(res.data.data.refresh_token);

      // 启动心跳上报
      startHeartbeat();

      notifier.success("登录成功");
      router.back();
      return res.data;
    } catch {
      notifier.error("登录失败");
    } finally {
      loading.value = false;
    }
  }

  // 5. 登出
  async function logout() {
    loading.value = true;
    try {
      await request.post("/auth/logout"); // 调用后端登出接口
    } catch {
      // console.error("登出失败:", err);
      notifier.error("登出失败");
    } finally {
      user.value = null;
      cacheUser(null);

      // 停止心跳上报
      stopHeartbeat();

      // 清除刷新令牌
      saveRefreshToken("");
      router.push("/"); // 跳转到首页
      notifier.success("已退出登录");
      loading.value = false;
    }
  }

  // 6. 刷新用户信息（更新资料后调用）
  async function refreshUser() {
    await fetchUser(); // 从后端获取最新数据并更新缓存
  }

  // 暴露给组件使用的状态和方法
  return {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isHydrated,
    fetchUser,
    hydrateAuth,
    login,
    logout,
    refreshUser,
    getRefreshToken,
    saveRefreshToken,
    startHeartbeat,
    stopHeartbeat,
  };
});
