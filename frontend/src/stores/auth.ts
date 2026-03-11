import request, { fetchAndStoreCSRF } from "@/request";
import router from "@/router";
import { useNotificationStore } from "@/stores/notification";
import { useStorage } from "@vueuse/core";
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
}

// sessionStorage key
const USER_INFO_KEY = "cached_user_info";

// 定义认证状态管理
export const useAuthStore = defineStore("auth", () => {
  // ---------------------- 状态（State） ----------------------
  const user = ref<UserInfo | null>(null); // 当前用户信息
  const loading = ref(false); // 加载状态
  const isHydrated = ref(false); // 是否初始化过
  const refreshToken = useStorage("refresh_token", "");

  const notifier = useNotificationStore(); // 通知提示

  // ---------------------- 计算属性（Computed） ----------------------
  // 是否已登录（根据 user 是否有值自动判断）
  const isAuthenticated = computed(() => !!user.value);

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

  // ---------------------- 方法（Actions） ----------------------

  // 2. 获取当前登录用户信息（从后端获取最新数据）
  async function fetchUser() {
    loading.value = true;
    try {
      const res = await request.get("/auth/me");
      const userData = res.data.data || null;
      user.value = userData;
      cacheUser(userData); // 缓存到 sessionStorage
    } catch (err: unknown) {
      console.error("获取用户信息失败:", err);
      notifier.error(err instanceof Error ? err.message : "获取用户信息失败");
      user.value = null;
      cacheUser(null);
    } finally {
      loading.value = false;
    }
  }

  // 3. 初始化认证状态（页面加载时调用一次）
  // 优先从 sessionStorage 读取，失败再请求后端
  async function hydrateAuth() {
    if (isHydrated.value) return; // 避免重复初始化

    // 1. 先尝试从缓存读取
    const cachedUser = getCachedUser();
    if (cachedUser) {
      user.value = cachedUser;
      isHydrated.value = true;
      return;
    }

    // 2. 缓存不存在，从后端获取
    await fetchUser();
    isHydrated.value = true;
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

      notifier.success("登录成功");
      router.back();
      return res.data;
    } catch (err: unknown) {
      notifier.error(err instanceof Error ? err.message : "登录失败");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 5. 登出
  async function logout() {
    loading.value = true;
    try {
      await request.post("/auth/logout"); // 调用后端登出接口
    } catch (err: unknown) {
      console.error("登出失败:", err);
      notifier.error(err instanceof Error ? err.message : "登出失败");
    } finally {
      user.value = null; // 清空用户信息
      cacheUser(null); // 清除缓存
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
    isHydrated,
    fetchUser,
    hydrateAuth,
    login,
    logout,
    refreshUser,
    getRefreshToken,
    saveRefreshToken,
  };
});
