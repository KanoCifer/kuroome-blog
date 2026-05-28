import { ref, onUnmounted } from 'vue';

export function useTypewriter() {
  const displayed = ref('');
  const isTyping = ref(false);
  const isDone = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function start(text: string, speed = 50, onComplete?: () => void) {
    stop();
    displayed.value = '';
    isTyping.value = true;
    isDone.value = false;
    let i = 0;

    timer = setInterval(() => {
      if (i < text.length) {
        displayed.value += text[i];
        i++;
      } else {
        stop();
        isDone.value = true;
        onComplete?.();
      }
    }, speed);
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    isTyping.value = false;
  }

  onUnmounted(stop);

  return { displayed, isTyping, isDone, start };
}
