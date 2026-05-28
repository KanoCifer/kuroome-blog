import { defineStore } from 'pinia';
import { ref } from 'vue';

interface CardOffset {
  x: number;
  y: number;
}

const STORAGE_KEY = 'readinglist_card_offsets';

function loadOffsets(): Record<string, CardOffset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useCardLayoutStore = defineStore('cardLayout', () => {
  // -- Editing state machine --
  const isEditing = ref(false);
  const snapshot = ref<Record<string, CardOffset> | null>(null);

  // -- Per-card offsets persisted to localStorage --
  const offsets = ref<Record<string, CardOffset>>(loadOffsets());

  function persistOffsets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets.value));
  }

  // -- Actions --
  function getOffset(cardName: string): CardOffset {
    return offsets.value[cardName] ?? { x: 0, y: 0 };
  }

  function setOffset(cardName: string, offset: CardOffset) {
    offsets.value = { ...offsets.value, [cardName]: offset };
  }

  function startEditing() {
    snapshot.value = JSON.parse(JSON.stringify(offsets.value));
    isEditing.value = true;
  }

  function saveEditing() {
    persistOffsets();
    snapshot.value = null;
    isEditing.value = false;
  }

  function cancelEditing() {
    if (snapshot.value) {
      offsets.value = JSON.parse(JSON.stringify(snapshot.value));
      snapshot.value = null;
    }
    isEditing.value = false;
  }

  function resetAllOffsets() {
    offsets.value = {};
    persistOffsets();
  }

  return {
    isEditing,
    offsets,
    snapshot,
    getOffset,
    setOffset,
    startEditing,
    saveEditing,
    cancelEditing,
    resetAllOffsets,
  };
});
