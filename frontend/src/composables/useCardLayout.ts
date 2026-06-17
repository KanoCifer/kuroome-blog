import cardStyles from '@/data/card-styles.json';
import { useCardLayoutStore } from '@/stores/cardLayout';
import { computed, shallowRef, watch, type CSSProperties, type Ref } from 'vue';
import { useLayoutCenter } from './useLayoutCenter';

/** Card style entry from card-styles.json */
interface CardStyle {
  width?: number;
  height: number;
  order: number;
}

const STYLES = cardStyles as Record<string, CardStyle>;

const cardNamesByOrder = Object.entries(STYLES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([name]) => name);

const maxOrder = Math.max(...Object.values(STYLES).map((s) => s.order));

const LAYOUT = {
  CARD_SPACING: 12,
  VERTICAL_GAP: 16,
  SIDE_COLUMN_GAP: 224,
  RIGHT_COL_X: 24,
  CAL_X_DELTA: -20,
  READING_LIST_X: -30,

  // First-card vertical ratios (subsequent cards cascade)
  GREETING_TOP_RATIO: 0.16,
  LIST_TOP_RATIO: 0.19,
  NAV_TOP_RATIO: 0.43,

  // Vertical fine-tuning (px) for first cards only
  LIST_Y_ADJUST: -20,

  // Cascade vertical offsets (after cascade top, before drag offset)
  PROFILE_CASCADE_ADJUST: -20,
  TECH_CASCADE_ADJUST: 90,

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
function position(top: number, left: number): CSSProperties {
  return { top: px(top), left: px(left) };
}

/** Cascade: return the center-top of a card placed below `prevCenterY` */
function cascadeTop(
  prevCenterY: number,
  prevHeight: number,
  thisHeight: number,
  gap: number,
): number {
  return prevCenterY + prevHeight / 2 + gap + thisHeight / 2;
}

/** Create a shallowRef<CSSProperties> that only updates when top/left actually change */
function usePositionRef(source: () => CSSProperties): Ref<CSSProperties> {
  const pos = shallowRef<CSSProperties>(source());

  watch(
    source,
    (next) => {
      // Only trigger reactivity when top or left actually changed
      if (pos.value.top !== next.top || pos.value.left !== next.left) {
        pos.value = next;
      }
    },
    { flush: 'sync' },
  );

  return pos;
}

// ── Composable ──────────────────────────────────────────

export function useCardLayout(containerRef: Ref<HTMLElement | null>) {
  const { centerX, layoutHeight, containerStyle } =
    useLayoutCenter(containerRef);
  const layoutStore = useCardLayoutStore();

  const leftAnchor = computed(
    () =>
      centerX.value -
      STYLES.BentoNavCard.width! / 2 -
      LAYOUT.CARD_SPACING -
      LAYOUT.SIDE_COLUMN_GAP,
  );
  const rightAnchor = computed(
    () =>
      centerX.value +
      STYLES.BentoClock.width! / 2 +
      LAYOUT.CARD_SPACING +
      LAYOUT.SIDE_COLUMN_GAP,
  );

  // ── First-card center Y (ratio + offset) ──

  const _greetingCenterY = computed(
    () =>
      layoutHeight.value * LAYOUT.GREETING_TOP_RATIO +
      layoutStore.getOffset('BentoMap').y,
  );
  const _picCenterY = computed(
    () =>
      layoutHeight.value * LAYOUT.LIST_TOP_RATIO +
      LAYOUT.LIST_Y_ADJUST +
      layoutStore.getOffset('BentoPic').y,
  );
  const _navCenterY = computed(
    () =>
      layoutHeight.value * LAYOUT.NAV_TOP_RATIO +
      layoutStore.getOffset('BentoNavCard').y,
  );

  // ── Right column cascade: Map → Clock → Calendar ──

  const _clockBaseY = computed(() =>
    cascadeTop(
      _greetingCenterY.value,
      STYLES.BentoMap.height,
      STYLES.BentoClock.height,
      LAYOUT.VERTICAL_GAP,
    ),
  );
  const _clockCenterY = computed(
    () => _clockBaseY.value + layoutStore.getOffset('BentoClock').y,
  );

  const _calBaseY = computed(() =>
    cascadeTop(
      _clockCenterY.value,
      STYLES.BentoClock.height,
      STYLES.BentoCalendar.height,
      LAYOUT.VERTICAL_GAP,
    ),
  );
  const _calCenterY = computed(
    () => _calBaseY.value + layoutStore.getOffset('BentoCalendar').y,
  );

  // ── Center column cascade: Pic → ProfileCard → ReadingList ──

  const _profileBaseY = computed(
    () =>
      cascadeTop(
        _picCenterY.value,
        STYLES.BentoPic.height,
        STYLES.BentoProfileCard.height,
        LAYOUT.VERTICAL_GAP,
      ) + LAYOUT.PROFILE_CASCADE_ADJUST,
  );
  const _profileCenterY = computed(
    () => _profileBaseY.value + layoutStore.getOffset('BentoProfileCard').y,
  );

  const _listBaseY = computed(() =>
    cascadeTop(
      _profileCenterY.value,
      STYLES.BentoProfileCard.height,
      STYLES.BentoReadingList.height,
      LAYOUT.VERTICAL_GAP,
    ),
  );
  const _listCenterY = computed(
    () => _listBaseY.value + layoutStore.getOffset('BentoReadingList').y,
  );

  const _todoBaseY = computed(() =>
    cascadeTop(
      _calCenterY.value,
      STYLES.BentoReadingList.height,
      STYLES.TodoCard.height,
      LAYOUT.VERTICAL_GAP,
    ),
  );
  const _todoCenterY = computed(
    () => _todoBaseY.value + layoutStore.getOffset('TodoCard').y,
  );

  // ── Left column cascade: NavCard → Tech ──

  const _techBaseY = computed(
    () =>
      cascadeTop(
        _navCenterY.value,
        STYLES.BentoNavCard.height,
        STYLES.BentoTech.height,
        LAYOUT.VERTICAL_GAP,
      ) + LAYOUT.TECH_CASCADE_ADJUST,
  );
  const _techCenterY = computed(
    () => _techBaseY.value + layoutStore.getOffset('BentoTech').y,
  );

  // ── Position objects (shallowRef — only triggers when string values change) ──

  const picPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoPic');
    return position(_picCenterY.value, centerX.value + o.x);
  });
  const profilePosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoProfileCard');
    return position(_profileCenterY.value, centerX.value + o.x);
  });
  const listCardPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoReadingList');
    return position(
      _listCenterY.value,
      centerX.value + LAYOUT.TODO_X_ADJUST + o.x,
    );
  });
  const todoCardPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('TodoCard');
    return position(_todoCenterY.value + 50, centerX.value + o.x + 300);
  });
  const navCardPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoNavCard');
    return position(
      _navCenterY.value - 20,
      leftAnchor.value + LAYOUT.NAV_X_ADJUST + o.x,
    );
  });
  const techPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoTech');
    return position(
      _techCenterY.value,
      leftAnchor.value + LAYOUT.CARD_SPACING + LAYOUT.TECH_X_ADJUST + o.x,
    );
  });
  const clockCardPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoClock');
    return position(
      _clockCenterY.value,
      rightAnchor.value + LAYOUT.RIGHT_COL_X + LAYOUT.CLOCK_X_ADJUST + o.x,
    );
  });
  const calendarPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoCalendar');
    return position(
      _calCenterY.value,
      rightAnchor.value + LAYOUT.RIGHT_COL_X + LAYOUT.CAL_X_DELTA + o.x,
    );
  });
  const greetingPosition = usePositionRef(() => {
    const o = layoutStore.getOffset('BentoMap');
    return position(
      _greetingCenterY.value,
      rightAnchor.value + LAYOUT.READING_LIST_X + o.x,
    );
  });

  return {
    centerX,
    containerStyle,
    picPosition,
    greetingPosition,
    profilePosition,
    navCardPosition,
    clockCardPosition,
    calendarPosition,
    techPosition,
    listCardPosition,
    todoCardPosition,
    cardStyles: STYLES,
    cardNamesByOrder,
    maxOrder,
  };
}
