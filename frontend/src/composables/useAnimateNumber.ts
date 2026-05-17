import { onUnmounted, ref } from "vue";

export function useAnimateNumber(duration = 800, steps = 20) {
  const displayValue = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const animateTo = (target: number) => {
    if (timer) clearInterval(timer);

    const increment = target / steps;
    let current = 0;

    timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        displayValue.value = target;
        if (timer) clearInterval(timer);
      } else {
        displayValue.value = Math.floor(current);
      }
    }, duration / steps);
  };

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { displayValue, animateTo };
}
