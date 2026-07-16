import { reactive, ref, watch, nextTick, type Ref } from 'vue';

export interface MasonryPosition {
  x: number;
  y: number;
  w: number;
}

/**
 * useMasonry — 最短列优先瀑布流布局
 *
 * 思路：
 * 1. 容器宽度由 ResizeObserver 追踪（响应式列宽）
 * 2. 每张卡片通过 setItemRef 注册其真实 DOM 节点
 * 3. compute() 测量每张卡片 offsetHeight，依次放入当前最短的列
 * 4. 输出每张卡片的绝对定位坐标 (x, y, w) 与容器总高度
 *
 * 列数 / 间距变化、容器宽度变化、内容增删后需调用 reflow()。
 */
export function useMasonry(options: {
  columnsCount: Ref<number>;
  columnsGap: Ref<number>;
}) {
  const { columnsCount, columnsGap } = options;

  // 容器 DOM（template ref 绑定）
  const containerEl = ref<HTMLElement | null>(null);
  const containerWidth = ref(0);

  // 模板直接读取的响应式状态（reactive 使得模板中 auto-unwrap）
  const state = reactive({
    containerHeight: 0,
    colWidth: 0,
    positions: [] as MasonryPosition[],
  });

  // 卡片 DOM 节点（按索引注册，非响应式以避免重复渲染）
  const itemEls: HTMLElement[] = [];

  const setItemRef = (el: unknown, index: number) => {
    if (el instanceof HTMLElement) itemEls[index] = el;
  };

  // 列表变化（增删/shuffle）后清空旧节点引用，避免 stale ref 留在旧下标
  const clearRefs = () => {
    itemEls.length = 0;
  };

  // --- 核心布局算法 ---
  const compute = () => {
    const count = columnsCount.value;
    const gap = columnsGap.value;
    const width = containerWidth.value;
    if (count <= 0 || width <= 0) return;

    const w = (width - gap * (count - 1)) / count;
    state.colWidth = w;

    const colHeights = Array.from({ length: count }, () => 0);
    const newPositions: MasonryPosition[] = [];

    for (let i = 0; i < itemEls.length; i++) {
      const el = itemEls[i];
      // 找到当前最短的列
      let shortest = 0;
      for (let c = 1; c < count; c++) {
        if (colHeights[c] < colHeights[shortest]) shortest = c;
      }
      const x = shortest * (w + gap);
      const y = colHeights[shortest];
      newPositions.push({ x, y, w });
      // 更新该列高度 = 当前高度 + 卡片真实高度 + 间距
      colHeights[shortest] += el ? el.offsetHeight + gap : gap;
    }

    state.positions = newPositions;
    state.containerHeight = Math.max(0, Math.max(...colHeights) - gap);
  };

  // 异步重排（等 DOM 更新后测量）
  const reflow = () => nextTick(compute);

  // --- 容器宽度追踪 ---
  let resizeObserver: ResizeObserver | null = null;
  const observeContainer = (el: HTMLElement | null) => {
    resizeObserver?.disconnect();
    if (!el) return;
    resizeObserver = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - containerWidth.value) > 0.5) {
        containerWidth.value = w;
      }
    });
    resizeObserver.observe(el);
    containerWidth.value = el.getBoundingClientRect().width;
  };

  // 容器挂载 / 卸载
  watch(containerEl, el => observeContainer(el ?? null));

  // 列数或间距变化 → 重排
  watch([columnsCount, columnsGap], reflow, { flush: 'post' });

  // 容器宽度变化（同列数下宽度微调，如侧栏开合）→ 重排
  watch(containerWidth, reflow);

  return {
    containerEl,
    setItemRef,
    clearRefs,
    state,
    reflow,
    compute,
  };
}
