export function buildWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE || '/api';
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/^http/, 'ws') + '/v2/publicv2/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${apiBase}/v2/publicv2/ws`;
}
