let accessToken = '';

export const tokenService = {
  get(): string {
    return accessToken;
  },

  getRefreshToken(): string {
    // refresh_token 还是走 cookie
    const match = document.cookie.match(/refresh_token=([^;]+)/);
    return match?.[1] ?? '';
  },

  save(token: string): void {
    accessToken = token;
  },

  clear(): void {
    accessToken = '';
  },
};
