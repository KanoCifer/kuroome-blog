import { saveRefreshTokenToStorage } from "@/api/refreshToken";
import { useStorage } from "@vueuse/core";

const refreshToken = useStorage("refresh_token", "");

export const tokenService = {
  get(): string {
    return refreshToken.value;
  },

  save(token: string): void {
    refreshToken.value = token;
    saveRefreshTokenToStorage(token);
  },

  clear(): void {
    tokenService.save("");
  },
};
