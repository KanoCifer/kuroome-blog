import { saveRefreshTokenToStorage } from "./refreshToken";

const TOKEN_KEY = 'refresh_token'

export const tokenService = {
  get(): string {
    return localStorage.getItem(TOKEN_KEY) ?? ""
  },

  save(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
    saveRefreshTokenToStorage(token);
  },

  clear(): void {
    localStorage.setItem(TOKEN_KEY, "")
  },
};
