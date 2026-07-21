// 用户 access-JWT 内存存储（模块级单例）。
// 真源设在 shared/auth：auth/todos/analytics 三端共用，features/auth 桶重新导出以保持兼容。

let accessToken = '';

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}
