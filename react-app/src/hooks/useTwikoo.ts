import { useCallback } from 'react';
import twikoo from 'twikoo';

export function useTwikoo() {
  return useCallback((options: { el: string; path?: string }) => {
    twikoo.init({ ...options, envId: 'https://kanocifer.chat/twikoo' });
  }, []);
}
