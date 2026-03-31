import { createAuthGateway } from "@/auth/authGateway";
import { createHeartbeat } from "@/auth/heartbeat";
import { getAuthSideEffects } from "@/auth/sideEffects";
import { tokenService } from "@/auth/tokenService";
import type { UserInfo } from "@/auth/types";
import { userCache } from "@/auth/userCache";
import { isAxiosError } from "axios";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

// 定义认证状态管理
export const useAuthStore = defineStore("auth", () => {
  // ---------------------- 状态（State） ----------------------
  const user = ref<UserInfo | null>(null);
  const loading = ref(false);
  const isHydrated = ref(false); // 是否初始化过
  const authGateway = createAuthGateway();
  const sideEffects = getAuthSideEffects();

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => !!user.value?.is_admin);

  const heartbeat = createHeartbeat({
    isAuthenticated: () => !!user.value,
    postHeartbeat: () => authGateway.postHeartbeat(),
    onError: (error: unknown) => {
      console.error("心跳上报失败:", error);
    },
  });

  // ---------------------- 辅助方法 ----------------------

  const saveRefreshToken = (token: string) => {
    tokenService.save(token);
  };

  // 启动心跳上报
  function startHeartbeat() {
    heartbeat.start();
  }

  // 停止心跳上报
  function stopHeartbeat() {
    heartbeat.stop();
  }

  // ---------------------- 方法（Actions） ----------------------

  // 2. 获取当前登录用户信息
  async function fetchUser(options: { silentOnUnauthenticated?: boolean } = {}) {
    loading.value = true;
    try {
      const userData = await authGateway.fetchUser();
      user.value = userData;
      userCache.set(userData); // 缓存到 sessionStorage
      // 启动心跳上报
      startHeartbeat();
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const isUnauthenticated = status === 401;
      if (!(options.silentOnUnauthenticated && isUnauthenticated)) {
        sideEffects.notifyError("登陆过期，请重新登录！");
      }
      user.value = null;
      userCache.clear();
    } finally {
      loading.value = false;
    }
  }

  async function hydrateAuth() {
    if (isHydrated.value) return; // 避免重复初始化

    try {
      // 1. 先尝试从缓存读取
      const cachedUser = userCache.get();
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
      sideEffects.notifyError("认证初始化失败");
      user.value = null;
      userCache.clear();
      isHydrated.value = true;
    }
  }

  async function initCSRF() {
    await authGateway.initCSRF();
  }

  async function getPasskeyAuthenticationOptions() {
    return authGateway.getPasskeyAuthenticationOptions();
  }

  // 4. 登录
  async function login(username: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const res = await authGateway.login(username, password, rememberMe);
      // 登录成功后获取 CSRF Token
      await initCSRF();
      // 登录响应中已包含用户信息，直接使用并缓存
      const userData = res.user;
      user.value = userData;
      userCache.set(userData);

      saveRefreshToken(res.refreshToken);

      // 启动心跳上报
      startHeartbeat();

      sideEffects.notifySuccess("登录成功");
      return res.raw;
    } catch (error) {
      sideEffects.notifyError("登录失败");
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loginWithPasskey(assertion: unknown) {
    loading.value = true;

    try {
      const res = await authGateway.loginWithPasskey(assertion);

      await initCSRF();
      saveRefreshToken(res.refreshToken);
      await fetchUser();

      sideEffects.notifySuccess("Passkey 登录成功！欢迎回来！");
      return res.raw;
    } catch (error) {
      sideEffects.notifyError("Passkey 登录失败");
      throw error;
    } finally {
      loading.value = false;
    }
  }

  const loginWithGitHub = () => {
    authGateway.loginWithGitHub();
  };

  // 5. 登出
  async function logout() {
    loading.value = true;
    try {
      await authGateway.logout(); // 调用后端登出接口
    } catch {
      // console.error("登出失败:", err);
      sideEffects.notifyError("登出失败");
    } finally {
      user.value = null;
      userCache.clear();

      // 停止心跳上报
      stopHeartbeat();

      // 清除刷新令牌
      saveRefreshToken("");

      try {
        await sideEffects.navigateToHome();
      } catch (error) {
        console.error("跳转首页失败:", error);
      }

      sideEffects.notifySuccess("已退出登录");
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
    getPasskeyAuthenticationOptions,
    login,
    loginWithPasskey,
    loginWithGitHub,
    logout,
    refreshUser,
  };
});
