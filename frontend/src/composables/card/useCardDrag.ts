import { useCardLayoutStore } from '@/stores/cardLayout';
import { ref } from 'vue';

interface DragState {
  cardName: string;
  startX: number;
  startY: number;
  originalOffsetX: number;
  originalOffsetY: number;
}

// ── Singleton state (only one card dragged at a time) ──────────

const draggingCard = ref<DragState | null>(null);
const activeElement = ref<HTMLElement | null>(null);
let layoutStore: ReturnType<typeof useCardLayoutStore> | null = null;

function cleanup() {
  if (activeElement.value) {
    activeElement.value.style.zIndex = '';
    activeElement.value.style.cursor = '';
    activeElement.value.style.translate = '';
  }
  draggingCard.value = null;
  activeElement.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerCancel);
}

function onPointerMove(e: PointerEvent) {
  if (!draggingCard.value || !activeElement.value) return;
  const dx = e.clientX - draggingCard.value.startX;
  const dy = e.clientY - draggingCard.value.startY;
  activeElement.value.style.translate = `calc(-50% + ${dx}px) calc(-50% + ${dy}px)`;
}

function onPointerUp(e: PointerEvent) {
  if (!draggingCard.value || !activeElement.value) return;

  const dx = e.clientX - draggingCard.value.startX;
  const dy = e.clientY - draggingCard.value.startY;

  layoutStore?.setOffset(draggingCard.value.cardName, {
    x: Math.round(draggingCard.value.originalOffsetX + dx),
    y: Math.round(draggingCard.value.originalOffsetY + dy),
  });

  cleanup();
}

function onPointerCancel() {
  if (draggingCard.value && layoutStore) {
    layoutStore.setOffset(draggingCard.value.cardName, {
      x: draggingCard.value.originalOffsetX,
      y: draggingCard.value.originalOffsetY,
    });
  }
  cleanup();
}

// ── Composable (singleton — shared across all DragWrapper instances) ──

export function useCardDrag() {
  if (!layoutStore) layoutStore = useCardLayoutStore();

  function onCardPointerDown(
    e: PointerEvent,
    cardName: string,
    element: HTMLElement,
  ) {
    if (!layoutStore!.isEditing) return;
    e.preventDefault();
    element.setPointerCapture(e.pointerId);

    const original = layoutStore!.getOffset(cardName);
    draggingCard.value = {
      cardName,
      startX: e.clientX,
      startY: e.clientY,
      originalOffsetX: original.x,
      originalOffsetY: original.y,
    };
    activeElement.value = element;

    element.style.zIndex = '100';
    element.style.cursor = 'grabbing';

    // Register listeners lazily — only while dragging
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }

  return {
    isEditing: layoutStore.isEditing,
    onCardPointerDown,
    draggingCard,
  };
}
