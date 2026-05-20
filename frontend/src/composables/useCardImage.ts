import { computed, ref } from "vue";

const CARD_IMAGES = Array.from({ length: 3 }, (_, i) => `/card/card-${i + 1}.jpeg`);

const CARD_KEY = "readinglist_card_imgae_index";

export function useCardImage() {
  const getImageIndex = (): number => {
    const stored = localStorage.getItem(CARD_KEY);
    const n = stored ? parseInt(stored, 1) : NaN;
    return Number.isFinite(n) && n >= 0 && n < CARD_IMAGES.length ? n : 0;
  };

  const cardIndex = ref<number>(getImageIndex());
  const imageSrc = computed(() => CARD_IMAGES[cardIndex.value]);

  const setCardIndex = (index: number) => {
    cardIndex.value = index;
    localStorage.setItem(CARD_KEY, String(index));
  };

  return {
    setCardIndex,
    imageSrc,
  };
}
