/// <reference types="vite/client" />

declare module "twikoo" {
  interface TwikooOptions {
    envId: string;
    el: string | HTMLElement;
    region?: string;
    path?: string;
    lang?: string;
    onCommentLoaded?: () => void;
  }

  export function init(options: TwikooOptions): void;
}
