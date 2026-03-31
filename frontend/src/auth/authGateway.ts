import { fetchAndStoreCSRF } from "@/api/csrf";
import request from "@/api/request";
import type { UserInfo } from "@/auth/types";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

interface ApiEnvelope<T> {
  data: T;
}

interface LoginPayload {
  refresh_token: string;
}

interface PasskeyLoginPayload {
  refresh_token?: string;
}

export interface LoginResult {
  user: UserInfo | null;
  refreshToken: string;
  raw: unknown;
}

export interface PasskeyLoginResult {
  refreshToken: string;
  raw: unknown;
}

export interface AuthGateway {
  fetchUser: () => Promise<UserInfo | null>;
  initCSRF: () => Promise<void>;
  getPasskeyAuthenticationOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  loginWithPasskey: (assertion: unknown) => Promise<PasskeyLoginResult>;
  logout: () => Promise<void>;
  postHeartbeat: () => Promise<void>;
  loginWithGitHub: () => void;
}

function extractData<T>(value: unknown): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as { data?: T };
  return payload.data;
}

export function createAuthGateway(): AuthGateway {
  return {
    async fetchUser(): Promise<UserInfo | null> {
      const res = await request.get<ApiEnvelope<UserInfo | null>>("/auth/me");
      return res.data.data || null;
    },

    async initCSRF(): Promise<void> {
      await fetchAndStoreCSRF();
    },

    async getPasskeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
      const res = await request.get<ApiEnvelope<PublicKeyCredentialRequestOptionsJSON>>(
        "/auth/passkey/authentication-options",
      );
      return res.data.data;
    },

    async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
      const res = await request.post<ApiEnvelope<LoginPayload & UserInfo>>("/auth/login", {
        username: username,
        password: password,
        remember_me: rememberMe,
      });

      const payload = res.data.data;
      return {
        user: payload || null,
        refreshToken: payload?.refresh_token ?? "",
        raw: res.data,
      };
    },

    async loginWithPasskey(assertion: unknown): Promise<PasskeyLoginResult> {
      const res = await request.post<ApiEnvelope<PasskeyLoginPayload>>("/auth/passkey/authenticate", {
        assertion: assertion,
      });

      const payload = res.data.data;
      return {
        refreshToken: payload?.refresh_token ?? "",
        raw: res.data,
      };
    },

    async logout(): Promise<void> {
      await request.post("/auth/logout");
    },

    async postHeartbeat(): Promise<void> {
      await request.post("/auth/heartbeat");
    },

    loginWithGitHub(): void {
      window.location.href = "/api/v1/auth/github";
    },
  };
}

export function extractUserFromUnknown(value: unknown): UserInfo | null {
  return extractData<UserInfo | null>(value) ?? null;
}
