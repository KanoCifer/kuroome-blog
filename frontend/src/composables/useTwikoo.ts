import twikoo from "twikoo";

interface TwikooOptions {
  el: string | HTMLElement;
  lang?: string;
  path?: string;
}

export function useTwikoo(options: TwikooOptions) {
  twikoo.init({ ...options, envId: "https://kanocifer.chat/twikoo" });

  return twikoo;
}
