const REFRESH_TOKEN_KEY = 'refresh_token';

let inMemoryRefreshToken = '';

function isBrowserStorageAvailable(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

export function getRefreshTokenFromStorage(): string {
  if (!isBrowserStorageAvailable()) {
    return inMemoryRefreshToken;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
}

export function saveRefreshTokenToStorage(token: string): void {
  inMemoryRefreshToken = token;

  if (!isBrowserStorageAvailable()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
