import { createAuthGateway } from '@/auth/authGateway';
import { createHeartbeat } from '@/auth/heartbeat';
import type { UserInfo } from '@/auth/types';
import { userCache } from '@/auth/userCache';
import { create } from 'zustand';

const authGateway = createAuthGateway();
const heartbeat = createHeartbeat({
  isAuthenticated: () => !!userCache.get(),
  postHeartbeat: () => authGateway.postHeartbeat(),
  onError: (error: unknown) => {
    console.error('心跳上报失败:', error);
  },
});

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
  loginWithGitHub: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  isAuthenticated: false,
  isHydrated: false,
  user: null,

  // 初始化
  hydrateAuth: async () => {
    if (userCache.get()) {
      set({
        isAuthenticated: true,
        user: userCache.get(),
        isHydrated: true,
      });
      heartbeat.start();
    }

    await authGateway.initCSRF();
    if (!userCache.get()) {
      try {
        const userData = await authGateway.fetchUser();
        set({
          isAuthenticated: !!userData,
          user: userData,
          isHydrated: true,
        });
        if (userData) {
          heartbeat.start();
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
  },

  login: async (username, password, rememberMe) => {
    const result = await authGateway.login(username, password, rememberMe);
    // 登录成功后更新状态
    set({
      isAuthenticated: true,
      user: result.user,
    });
  },

  logout: () => {
    authGateway.logout().then(() => {
      // 注销成功后更新状态
      set({
        isAuthenticated: false,
        user: null,
      });
    });
  },

  loginWithPasskey: async (assertion: unknown) => {
    const result = await authGateway.loginWithPasskey(assertion);
    // 登录成功后更新状态
    set({
      isAuthenticated: true,
      user: result.user,
    });
  },

  loginWithGitHub: () => {
    authGateway.loginWithGitHub();
  },
}));
