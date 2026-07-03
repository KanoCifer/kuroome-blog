import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCounterStore } from '../counter';

describe('counter store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('初始 count 为 0', () => {
    const store = useCounterStore();
    expect(store.count).toBe(0);
    expect(store.doubleCount).toBe(0);
  });

  it('increment 增加 count', () => {
    const store = useCounterStore();
    store.increment();
    expect(store.count).toBe(1);
    expect(store.doubleCount).toBe(2);
  });

  it('多次 increment 正确累加', () => {
    const store = useCounterStore();
    store.increment();
    store.increment();
    store.increment();
    expect(store.count).toBe(3);
    expect(store.doubleCount).toBe(6);
  });

  it('不同测试用例互不污染', () => {
    const store = useCounterStore();
    // 如果 beforeEach 的 pinia 重置生效，初始应为 0
    expect(store.count).toBe(0);
  });
});
