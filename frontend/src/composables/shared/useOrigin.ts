export function useOrigin(url: string) {
  const protocol = location.protocol; // "https:"
  if (protocol === 'http:') {
    return url;
  }
  return 'https://api.kanocifer.chat' + url;
}
