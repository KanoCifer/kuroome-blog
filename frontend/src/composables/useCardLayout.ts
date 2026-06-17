import cardStyles from '@/data/card-styles.json';
import { useCardLayoutStore } from '@/stores/cardLayout';
import {
  computed,
  shallowRef,
  watch,
  type ComputedRef,
  type CSSProperties,
  type Ref,
} from 'vue';
import { useLayoutCenter } from './useLayoutCenter';

/** Card style entry from card-styles.json */
interface CardStyle {
  width?: number;
  height: number;
  order: number;
}

const styles = cardStyles as Record<string, CardStyle>;

const cardNamesByOrder = Object.entries(styles)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([name]) => name);

const maxOrder = Math.max(...Object.values(styles).map((s) => s.order));

/** Structural layout constants (px). Per-card tuning lives in `cardSpecs`. */
const cardSpacing = 12;
const verticalGap = 16;
const sideColumnGap = 224;

/** Safe width accessor — anchors only depend on cards that always declare one. */
function widthOf(name: string): number {
  return styles[name].width ?? 0;
}

// ── Declarative card layout ─────────────────────────────
// Each card declares its column, X offset from that column's anchor, and a Y
// source: either a top-ratio (first row) or a cascade-from another card.
// prevHeight / thisHeight for cascades are derived from `styles`, so a card's
// vertical placement is fully determined by this table.

type Column = 'left' | 'center' | 'right';

interface CardSpec {
  /** Export name used by consumers (the `*Position` ref). */
  as: string;
  /** Card name (key into `styles` / drag offsets). */
  name: string;
  column: Column;
  /** Horizontal offset from the column anchor (px). */
  xOffset: number;
  /** First-row cards: center Y = layoutHeight * topRatio + yOffset. */
  topRatio?: number;
  /** Cascaded cards: placed below this card's center Y. */
  cascadeFrom?: string;
  /** Extra Y (px) added after the ratio/cascade base + drag offset. */
  yOffset?: number;
}

// Ordered so every `cascadeFrom` target appears before its dependents.
const cardSpecs: CardSpec[] = [
  // ── First row (ratio-anchored) ──
  { as: 'greetingPosition',  name: 'BentoMap',         column: 'right',  xOffset: -30,  topRatio: 0.16 },
  { as: 'picPosition',       name: 'BentoPic',         column: 'center', xOffset: 0,    topRatio: 0.19, yOffset: -20 },
  { as: 'navCardPosition',   name: 'BentoNavCard',     column: 'left',   xOffset: 20,   topRatio: 0.43, yOffset: -20 },

  // ── Right column: Map → Clock → Calendar ──
  { as: 'clockCardPosition', name: 'BentoClock',       column: 'right',  xOffset: -46,  cascadeFrom: 'BentoMap' },
  { as: 'calendarPosition',  name: 'BentoCalendar',    column: 'right',  xOffset: 4,    cascadeFrom: 'BentoClock' },

  // ── Center column: Pic → ProfileCard → ReadingList ──
  { as: 'profilePosition',   name: 'BentoProfileCard', column: 'center', xOffset: 0,    cascadeFrom: 'BentoPic',        yOffset: -20 },
  { as: 'listCardPosition',  name: 'BentoReadingList', column: 'center', xOffset: 40,   cascadeFrom: 'BentoProfileCard' },

  // ── Left column: NavCard → Tech ──
  { as: 'techPosition',      name: 'BentoTech',        column: 'left',   xOffset: 102,  cascadeFrom: 'BentoNavCard',    yOffset: 90 },

  // ── Floating card: Todo cascades from the Calendar row ──
  { as: 'todoCardPosition',  name: 'TodoCard',         column: 'center', xOffset: 300,  cascadeFrom: 'BentoCalendar' },
];

// ── Layout helpers ──────────────────────────────────────

function px(value: number): string {
  return `${value}px`;
}

/** Build {top, left} style object for absolute-positioned cards */
function position(top: number, left: number): CSSProperties {
  return { top: px(top), left: px(left) };
}

/** Center-top of a card placed below `prevCenterY`, separated by `gap`. */
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

  // Column anchors
  const leftAnchor = computed(
    () =>
      centerX.value -
      widthOf('BentoNavCard') / 2 -
      cardSpacing -
      sideColumnGap,
  );
  const rightAnchor = computed(
    () =>
      centerX.value + widthOf('BentoClock') / 2 + cardSpacing + sideColumnGap,
  );

  const dragY = (name: string) => layoutStore.getOffset(name).y;
  const dragX = (name: string) => layoutStore.getOffset(name).x;

  // Center Y per card, resolved in spec order (parents before children).
  const centerY = new Map<string, ComputedRef<number>>();
  for (const spec of cardSpecs) {
    centerY.set(
      spec.name,
      spec.topRatio != null
        ? computed(
            () =>
              layoutHeight.value * spec.topRatio! +
              (spec.yOffset ?? 0) +
              dragY(spec.name),
          )
        : computed(() => {
            const prev = spec.cascadeFrom!;
            return (
              cascadeTop(
                centerY.get(prev)!.value,
                styles[prev].height,
                styles[spec.name].height,
                verticalGap,
              ) +
              (spec.yOffset ?? 0) +
              dragY(spec.name)
            );
          }),
    );
  }

  const anchorFor = (col: Column): Ref<number> =>
    col === 'left' ? leftAnchor : col === 'right' ? rightAnchor : centerX;

  // Build one stable position ref per card, keyed by the exported name.
  const positions: Record<string, Ref<CSSProperties>> = {};
  for (const spec of cardSpecs) {
    const y = centerY.get(spec.name)!;
    const anchor = anchorFor(spec.column);
    positions[spec.as] = usePositionRef(() =>
      position(y.value, anchor.value + spec.xOffset + dragX(spec.name)),
    );
  }

  return {
    centerX,
    containerStyle,
    picPosition: positions.picPosition,
    greetingPosition: positions.greetingPosition,
    profilePosition: positions.profilePosition,
    navCardPosition: positions.navCardPosition,
    clockCardPosition: positions.clockCardPosition,
    calendarPosition: positions.calendarPosition,
    techPosition: positions.techPosition,
    listCardPosition: positions.listCardPosition,
    todoCardPosition: positions.todoCardPosition,
    cardStyles: styles,
    cardNamesByOrder,
    maxOrder,
  };
}
