import request, { setOnUnauthorized } from "@/request";
import router from "@/router";
import { useNotificationStore } from "@/stores/notification";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

// 用户信息类型定义（保留，用于 TypeScript 类型提示）
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

// 定义认证状态管理
export const useAuthStore = defineStore("auth", () => {
  // ---------------------- 状态（State） ----------------------
  const user = ref<UserInfo | null>(null); // 当前用户信息
  const loading = ref(false); // 加载状态
  const isHydrated = ref(false); // 是否初始化过
  const accessToken = ref<string | null>(null);

  const notifier = useNotificationStore(); // 通知提示

  // ---------------------- 计算属性（Computed） ----------------------
  // 是否已登录（根据 user 是否有值自动判断）
  const isAuthenticated = computed(() => !!user.value);

  // ---------------------- 方法（Actions） ----------------------

  // 1. 设置 401 未授权回调（登录过期时触发）
  setOnUnauthorized(() => {
    user.value = null;
    // router.push("/login"); // 跳转到登录页
    notifier.error("登录已过期，请重新登录");
  });

  // 2. 获取当前登录用户信息
  async function fetchUser() {
    loading.value = true;
    try {
      const res = await request.get("/auth/me");
      user.value = res.data.data || null;
    } catch (err: unknown) {
      console.error("获取用户信息失败:", err);
      notifier.error(err instanceof Error ? err.message : "获取用户信息失败");
      user.value = null; // 请求失败则清空用户信息
    } finally {
      loading.value = false;
    }
  }

  // 3. 初始化认证状态（页面加载时调用一次）
  async function hydrateAuth() {
    if (isHydrated.value) return; // 避免重复初始化
    await fetchUser();
    isHydrated.value = true;
  }

  // 4. 登录
  async function login(username: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const res = await request.post("/auth/login", {
        username,
        password,
        remember_me: rememberMe,
      });
      // if (res.data.access_token) {
      //   sessionStorage.setItem("access_token", res.data.access_token);
      //   accessToken.value = res.data.access_token;
      // }
      user.value = res.data.data || null;
      notifier.success("登录成功");
      router.back(); // 登录成功返回上一页
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
      router.push("/"); // 跳转到首页

      accessToken.value = null; // 清空 token
      sessionStorage.removeItem("access_token");
      notifier.success("已退出登录");
      loading.value = false;
    }
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
  };
});
