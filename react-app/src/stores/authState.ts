import { createAuthGateway } from '@/auth/authGateway';
import type { UserInfo } from '@/auth/types';
import { userCache } from '@/auth/userCache';
import { saveRefreshTokenToStorage } from '@/auth/refreshToken';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { create } from 'zustand';

const authGateway = createAuthGateway();
let isLoggingOut = false;
let hydrationPromise: Promise<void> | null = null;

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  isHydrated: boolean;
  hydrateAuth: () => Promise<void>;
  login: (
    username: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => void;
  loginWithPasskey: (assertion: unknown) => Promise<void>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  loginWithGitHub: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  isAuthenticated: false,
  isHydrated: false,
  user: null,

  // 初始化
  hydrateAuth: async () => {
    // 单例模式：避免并发调用重复请求 /auth/me
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      if (userCache.get()) {
        set({
          isAuthenticated: true,
          user: userCache.get(),
          isHydrated: true,
        });
        return;
      }

      await authGateway.initCSRF();

      if (!userCache.get()) {
        try {
          const userData = await authGateway.fetchUser();
          // 原子更新：确保 user 和 isHydrated 同时更新，避免 loader 看到中间状态
          set({
            isAuthenticated: !!userData,
            user: userData,
            isHydrated: true,
          });
          if (userData) {
          }
        } catch (err) {
          console.error('获取用户信息失败:', err);
          set({
            isAuthenticated: false,
            user: null,
            isHydrated: true,
          });
        }
      }
    })();

    return hydrationPromise;
  },

  login: async (username, password, rememberMe) => {
    const result = await authGateway.login(username, password, rememberMe);
    // 登录成功后更新状态、保存 refresh token 和 userCache
    if (result.refreshToken) {
      saveRefreshTokenToStorage(result.refreshToken);
    }
    if (result.user) {
      userCache.set(result.user);
    }
    set({
      isAuthenticated: true,
      user: result.user,
    });
  },

  logout: () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    userCache.clear();
    authGateway
      .logout()
      .then(() => {
        isLoggingOut = false;
        // 注销成功后更新状态
        set({
          isAuthenticated: false,
          user: null,
        });
      })
      .catch(() => {
        isLoggingOut = false;
      });
  },

  loginWithPasskey: async (assertion: unknown) => {
    const result = await authGateway.loginWithPasskey(assertion);
    // 登录成功后更新状态、保存 refresh token 和 userCache
    if (result.refreshToken) {
      saveRefreshTokenToStorage(result.refreshToken);
    }
    if (result.user) {
      userCache.set(result.user);
    }
    set({
      isAuthenticated: true,
      user: result.user,
    });
  },

  getPasskeyAuthenticationOptions: async () => {
    return authGateway.getPasskeyAuthenticationOptions();
  },

  loginWithGitHub: () => {
    authGateway.loginWithGitHub();
  },
}));
