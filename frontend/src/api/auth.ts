// 用户 access-JWT 内存存储（模块级单例）。
// 真源设在 lib/auth：request 与 features/auth 共用，同处基础设施层。

let accessToken = '';

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}
