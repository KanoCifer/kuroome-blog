import cardStyles from "@/data/card-styles.json";
import { computed, type Ref } from "vue";
import { useLayoutCenter } from "./useLayoutCenter";

/** Card style entry from card-styles.json */
interface CardStyle {
  width: number;
  height: number;
  order: number;
}

const STYLES = cardStyles as Record<string, CardStyle>;

// ── Named Layout Constants ──────────────────────────────
// Replaces the magic numbers previously scattered across EntryView.vue

const LAYOUT = {
  /** Gap between center column and left/right side columns */
  CARD_SPACING: 12,
  /** Horizontal gap from center column edge to side columns */
  SIDE_COLUMN_GAP: 224,
  /** Standard right-column x-offset from rightTotal */
  RIGHT_COL_X: 24,
  /** Extra x-offset for calendar (total = RIGHT_COL_X + CAL_X_DELTA) */
  CAL_X_DELTA: -20,
  /** ReadingList leftward offset from rightTotal */
  READING_LIST_X: -30,
  /** Tech card vertical fine-tuning */
  TECH_Y_ADJUST: 10,
  /** Nav card vertical position ratio */
  NAV_TOP_RATIO: 0.4,
  /** Tech card vertical position ratio */
  TECH_TOP_RATIO: 0.75,
  /** Cat card horizontal ratio (multiplied by parentWidth) */
  CAT_LEFT_RATIO: 0.9,
  /** Cat card horizontal fine-tuning */
  CAT_X_ADJUST: 20,
  /** Cat card vertical position ratio */
  CAT_TOP_RATIO: 0.79,
  /** Calendar vertical position ratio */
  CAL_TOP_RATIO: 0.625,
  /** Calendar vertical fine-tuning */
  CAL_Y_ADJUST: 40,
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

/**
 * Computes all card positions from center point + card-styles config.
 * Cards that use `-translate-x-1/2 -translate-y-1/2` in the template
 * receive centered positions here — no offset needed.
 */
export function useCardLayout(containerRef: Ref<HTMLElement | null>) {
  const { centerX, layoutHeight, containerStyle } =
    useLayoutCenter(containerRef);

  // leftTotal / rightTotal anchor the left and right column clusters.
  // These use card-style widths so positions auto-adjust if config changes.
  const leftAnchor = computed(
    () =>
      centerX.value -
      STYLES.BentoNavCard.width / 2 -
      LAYOUT.CARD_SPACING -
      LAYOUT.SIDE_COLUMN_GAP,
  );
  const rightAnchor = computed(
    () =>
      centerX.value +
      STYLES.BentoClock.width / 2 +
      LAYOUT.CARD_SPACING +
      LAYOUT.SIDE_COLUMN_GAP,
  );

  // Center column (greeting map + profile card)
  const listCardPosition = computed(() =>
    position(layoutHeight.value * 0.05 - 20, centerX.value),
  );
  const profilePosition = computed(() =>
    position(layoutHeight.value * 0.5, centerX.value),
  );

  // Left column
  const navCardPosition = computed(() =>
    position(layoutHeight.value * LAYOUT.NAV_TOP_RATIO, leftAnchor.value + 20),
  );

  const techPosition = computed(() =>
    position(
      layoutHeight.value * LAYOUT.TECH_TOP_RATIO + LAYOUT.TECH_Y_ADJUST,
      leftAnchor.value + LAYOUT.CARD_SPACING + 90,
    ),
  );

  // Right column
  const websitesPosition = computed(() =>
    position(layoutHeight.value * 0.1, rightAnchor.value + LAYOUT.RIGHT_COL_X),
  );

  const clockCardPosition = computed(() =>
    position(
      layoutHeight.value * 0.45 - 50,
      rightAnchor.value + LAYOUT.RIGHT_COL_X - 70,
    ),
  );
  const calendarPosition = computed(() =>
    position(
      layoutHeight.value * LAYOUT.CAL_TOP_RATIO + LAYOUT.CAL_Y_ADJUST,
      rightAnchor.value + LAYOUT.RIGHT_COL_X + LAYOUT.CAL_X_DELTA,
    ),
  );
  const greetingPosition = computed(() =>
    position(
      layoutHeight.value * 0.2,
      rightAnchor.value + LAYOUT.READING_LIST_X,
    ),
  );

  // Cat (positioned relative to center with ratio + offset)
  const catPosition = computed(() =>
    position(
      layoutHeight.value * LAYOUT.CAT_TOP_RATIO,
      centerX.value * LAYOUT.CAT_LEFT_RATIO + LAYOUT.CAT_X_ADJUST,
    ),
  );

  const todoPosition = computed(() =>
    position(layoutHeight.value * 0.8 - 20, centerX.value + 40),
  );

  // Card names sorted by order for animation sequencing
  const cardNamesByOrder = Object.entries(STYLES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name]) => name);

  const maxOrder = Math.max(...Object.values(STYLES).map((s) => s.order));

  return {
    containerStyle,
    todoPosition,
    greetingPosition,
    profilePosition,
    navCardPosition,
    websitesPosition,
    clockCardPosition,
    calendarPosition,
    techPosition,
    listCardPosition,
    catPosition,
    cardStyles: STYLES,
    cardNamesByOrder,
    maxOrder,
  };
}
