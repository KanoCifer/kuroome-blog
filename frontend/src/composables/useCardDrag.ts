import { useCardLayoutStore } from "@/stores/cardLayout";
import { onUnmounted, ref } from "vue";

interface DragState {
  cardName: string;
  startX: number;
  startY: number;
  originalOffsetX: number;
  originalOffsetY: number;
}

export function useCardDrag() {
  const layoutStore = useCardLayoutStore();
  const draggingCard = ref<DragState | null>(null);
  const activeElement = ref<HTMLElement | null>(null);

  function onCardPointerDown(
    e: PointerEvent,
    cardName: string,
    element: HTMLElement,
  ) {
    if (!layoutStore.isEditing) return;
    e.preventDefault();
    element.setPointerCapture(e.pointerId);

    const original = layoutStore.getOffset(cardName);
    draggingCard.value = {
      cardName,
      startX: e.clientX,
      startY: e.clientY,
      originalOffsetX: original.x,
      originalOffsetY: original.y,
    };
    activeElement.value = element;

    element.style.zIndex = "100";
    element.style.cursor = "grabbing";
  }

  function onCardPointerMove(e: PointerEvent) {
    if (!draggingCard.value || !activeElement.value) return;
    const dx = e.clientX - draggingCard.value.startX;
    const dy = e.clientY - draggingCard.value.startY;

    activeElement.value.style.translate = `calc(-50% + ${dx}px) calc(-50% + ${dy}px)`;
  }

  function onCardPointerUp(e: PointerEvent) {
    if (!draggingCard.value || !activeElement.value) return;

    const dx = e.clientX - draggingCard.value.startX;
    const dy = e.clientY - draggingCard.value.startY;
    const finalOffsetX = draggingCard.value.originalOffsetX + dx;
    const finalOffsetY = draggingCard.value.originalOffsetY + dy;

    // Commit to store — useCardLayout will recompute top/left with new offset
    layoutStore.setOffset(draggingCard.value.cardName, {
      x: Math.round(finalOffsetX),
      y: Math.round(finalOffsetY),
    });

    // Reset DOM; Vue reactivity will restore translate to -50% -50%
    // because top/left now include the offset baked in.
    activeElement.value.style.zIndex = "";
    activeElement.value.style.cursor = "";
    activeElement.value.style.translate = "";

    draggingCard.value = null;
    activeElement.value = null;
  }

  onUnmounted(() => {
    draggingCard.value = null;
    activeElement.value = null;
  });

  return {
    isEditing: layoutStore.isEditing,
    onCardPointerDown,
    onCardPointerMove,
    onCardPointerUp,
    draggingCard,
  };
}
