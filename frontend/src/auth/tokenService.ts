/**
 * Token 服务
 * 跨域场景下，token 存储在后端 cookie（带 domain），前端从这里辅助读取
 * 实际认证由后端 cookie + withCredentials 处理
 */

const TOKEN_REGEX = {
  access_token: /access_token=([^;]+)/,
  refresh_token: /refresh_token=([^;]+)/,
};

function getCookie(name: "access_token" | "refresh_token"): string {
  const match = document.cookie.match(TOKEN_REGEX[name]);
  return match?.[1] ?? "";
}

export const tokenService = {
  get(): string {
    // 读取 access_token（用于某些需要 header 的场景）
    return getCookie("access_token");
  },

  getRefreshToken(): string {
    // 读取 refresh_token（用于某些需要手动处理的场景）
    return getCookie("refresh_token");
  },

  save(_token: string): void {
    // 空实现，token 由后端设置在 cookie 中
  },

  clear(): void {
    // 空实现，logout 时后端清除 cookie
  },
};
