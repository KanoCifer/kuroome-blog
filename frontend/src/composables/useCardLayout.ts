import cardStyles from "@/data/card-styles.json";
import { useCardLayoutStore } from "@/stores/cardLayout";
import { computed, type Ref } from "vue";
import { useLayoutCenter } from "./useLayoutCenter";

/** Card style entry from card-styles.json */
interface CardStyle {
  width?: number;
  height?: number;
  order: number;
}

const STYLES = cardStyles as Record<string, CardStyle>;

const cardNamesByOrder = Object.entries(STYLES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([name]) => name);

const maxOrder = Math.max(...Object.values(STYLES).map((s) => s.order));

const LAYOUT = {
  CARD_SPACING: 12,
  SIDE_COLUMN_GAP: 224,
  RIGHT_COL_X: 24,
  CAL_X_DELTA: -20,
  READING_LIST_X: -30,

  // Vertical position ratios
  LIST_TOP_RATIO: 0.23,
  PROFILE_TOP_RATIO: 0.5,
  NAV_TOP_RATIO: 0.4,
  TECH_TOP_RATIO: 0.75,
  CLOCK_TOP_RATIO: 0.45,
  CAL_TOP_RATIO: 0.625,
  GREETING_TOP_RATIO: 0.2,
  TODO_TOP_RATIO: 0.8,

  // Vertical fine-tuning (px)
  LIST_Y_ADJUST: -20,
  TECH_Y_ADJUST: 10,
  CLOCK_Y_ADJUST: -50,
  CAL_Y_ADJUST: 40,
  TODO_Y_ADJUST: -20,

  // Horizontal fine-tuning (px)
  NAV_X_ADJUST: 20,
  TECH_X_ADJUST: 90,
  CLOCK_X_ADJUST: -70,
  TODO_X_ADJUST: 40,
} as const;

// ── Layout helpers ──────────────────────────────────────

function px(value: number): string {
  return `${value}px`;
}

/** Build {top, left} style object for absolute-positioned cards */
function position(top: number, left: number) {
  return { top: px(top), left: px(left) };
}

// ── Composable ──────────────────────────────────────────

export function useCardLayout(containerRef: Ref<HTMLElement | null>) {
  const { centerX, layoutHeight, containerStyle } = useLayoutCenter(containerRef);
  const layoutStore = useCardLayoutStore();

  const leftAnchor = computed(
    () => centerX.value - STYLES.BentoNavCard.width! / 2 - LAYOUT.CARD_SPACING - LAYOUT.SIDE_COLUMN_GAP,
  );
  const rightAnchor = computed(
    () => centerX.value + STYLES.BentoClock.width! / 2 + LAYOUT.CARD_SPACING + LAYOUT.SIDE_COLUMN_GAP,
  );

  // Center column (greeting map + profile card)
  const picPosition = computed(() => {
    const o = layoutStore.getOffset("BentoPic");
    return position(layoutHeight.value * LAYOUT.LIST_TOP_RATIO + LAYOUT.LIST_Y_ADJUST + o.y, centerX.value + o.x);
  });
  const profilePosition = computed(() => {
    const o = layoutStore.getOffset("BentoProfileCard");
    return position(layoutHeight.value * LAYOUT.PROFILE_TOP_RATIO + o.y, centerX.value + o.x);
  });

  // Left column
  const navCardPosition = computed(() => {
    const o = layoutStore.getOffset("BentoNavCard");
    return position(layoutHeight.value * LAYOUT.NAV_TOP_RATIO + o.y, leftAnchor.value + LAYOUT.NAV_X_ADJUST + o.x);
  });

  const techPosition = computed(() => {
    const o = layoutStore.getOffset("BentoTech");
    return position(
      layoutHeight.value * LAYOUT.TECH_TOP_RATIO + LAYOUT.TECH_Y_ADJUST + o.y,
      leftAnchor.value + LAYOUT.CARD_SPACING + LAYOUT.TECH_X_ADJUST + o.x,
    );
  });

  // Right column
  const clockCardPosition = computed(() => {
    const o = layoutStore.getOffset("BentoClock");
    return position(
      layoutHeight.value * LAYOUT.CLOCK_TOP_RATIO + LAYOUT.CLOCK_Y_ADJUST + o.y,
      rightAnchor.value + LAYOUT.RIGHT_COL_X + LAYOUT.CLOCK_X_ADJUST + o.x,
    );
  });
  const calendarPosition = computed(() => {
    const o = layoutStore.getOffset("BentoCalendar");
    return position(
      layoutHeight.value * LAYOUT.CAL_TOP_RATIO + LAYOUT.CAL_Y_ADJUST + o.y,
      rightAnchor.value + LAYOUT.RIGHT_COL_X + LAYOUT.CAL_X_DELTA + o.x,
    );
  });
  const greetingPosition = computed(() => {
    const o = layoutStore.getOffset("BentoMap");
    return position(
      layoutHeight.value * LAYOUT.GREETING_TOP_RATIO + o.y,
      rightAnchor.value + LAYOUT.READING_LIST_X + o.x,
    );
  });

  const listCardPosition = computed(() => {
    const o = layoutStore.getOffset("BentoReadingList");
    return position(
      layoutHeight.value * LAYOUT.TODO_TOP_RATIO + LAYOUT.TODO_Y_ADJUST + o.y,
      centerX.value + LAYOUT.TODO_X_ADJUST + o.x,
    );
  });

  return {
    containerStyle,
    picPosition,
    greetingPosition,
    profilePosition,
    navCardPosition,
    clockCardPosition,
    calendarPosition,
    techPosition,
    listCardPosition,
    cardStyles: STYLES,
    cardNamesByOrder,
    maxOrder,
  };
}
