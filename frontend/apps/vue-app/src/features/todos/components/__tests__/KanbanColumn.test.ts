/**
 * KanbanColumn 渲染契约单测 —— 钉住"扁平列"改造后的对外行为。
 *
 * 这次改造把列内「按 user_id 分组的泳道 + 手写高度测量 + translateY 窗口化」
 * 换成了「列内平铺卡片，离屏交给卡片自身的 content-visibility」。
 * 下面的断言就是那次改造的契约：谁把泳道层、spacer 或 JS 窗口化加回来，这里先红。
 *
 * 覆盖:
 * - 卡片数 == tasks.length，且所有卡片共用同一个父元素（没有按 user_id 分组的泳道层）
 * - 列内容区的元素子节点只有卡片本身（没有 spacer / 绝对定位占位）
 * - 列头计数 == tasks.length
 * - 空列 → 0 卡片 + 空态文案；dragOver 时空态切到「松开以放置」
 * - open / cycle / delete / dragstart / dragend / dragover / drop 事件透传
 * - 60 条任务全量渲染（不做 JS 窗口化）
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import type { DevTask } from '@/features/todos/api';
import { KANBAN_COLUMNS } from '@/features/todos/composables/devTaskPolicy';
import KanbanColumn from '../KanbanColumn.vue';

// ── 测试夹具 ─────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<DevTask> = {}): DevTask {
  return {
    id: '1',
    slug: 'task-1',
    title: 'task',
    type: '功能需求',
    priority: 'P2 中',
    status: '待评估',
    scope: '',
    user_id: 1,
    sort_order: 0,
    is_deleted: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const TODO_COLUMN = KANBAN_COLUMNS[0];

function mountColumn(
  tasks: DevTask[],
  overrides: Partial<{ draggedSlug: string | null; dragOver: boolean }> = {},
) {
  return mount(KanbanColumn, {
    props: {
      column: TODO_COLUMN,
      tasks,
      draggedSlug: null,
      dragOver: false,
      ...overrides,
    },
    // VTU 默认把 Transition 换成 <transition-stub> 元素，会混进列内容区的
    // 子节点计数里；关掉它，观察到的 DOM 才和生产一致。
    global: { stubs: { transition: false } },
  });
}

/** 列内容滚动区 —— 空态下没有卡片可反查父元素，只能按类找。 */
function scroller(wrapper: ReturnType<typeof mountColumn>) {
  const el = wrapper.find('.overflow-y-auto');
  expect(el.exists()).toBe(true);
  return el.element as HTMLElement;
}

// ── 扁平渲染 ─────────────────────────────────────────────────────────────

describe('KanbanColumn 扁平渲染', () => {
  it('卡片数 == tasks.length，且全部共用同一个父元素（无泳道分组层）', () => {
    // 4 条任务横跨 3 个 user_id —— 旧泳道实现会渲染成 3 个分组容器
    const tasks = [
      makeTask({ slug: 't1', user_id: 1 }),
      makeTask({ slug: 't2', user_id: 1 }),
      makeTask({ slug: 't3', user_id: 2 }),
      makeTask({ slug: 't4', user_id: 3 }),
    ];
    const wrapper = mountColumn(tasks);

    const cards = wrapper.findAll('article');
    expect(cards).toHaveLength(4);

    const parents = new Set(cards.map((c) => c.element.parentElement));
    expect(parents.size).toBe(1);
  });

  it('列内容区只有卡片本身 —— 没有 spacer / 占位层等窗口化痕迹', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ slug: `t${i}`, sort_order: i }),
    );
    const wrapper = mountColumn(tasks);

    const cards = wrapper.findAll('article');
    const parent = cards[0].element.parentElement as HTMLElement;

    // 元素子节点数与卡片数严格相等：多出来的就是泳道壳或占位 div
    expect(parent.children).toHaveLength(5);
    expect(parent.querySelectorAll('article')).toHaveLength(5);
  });

  it('不做 JS 窗口化：60 条任务全部渲染出来', () => {
    const tasks = Array.from({ length: 60 }, (_, i) =>
      makeTask({ slug: `t${i}`, sort_order: i }),
    );
    const wrapper = mountColumn(tasks);

    expect(wrapper.findAll('article')).toHaveLength(60);
    expect(scroller(wrapper).children).toHaveLength(60);
  });

  it('列头计数 == tasks.length', () => {
    const tasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ slug: `t${i}`, sort_order: i }),
    );
    const wrapper = mountColumn(tasks);

    expect(wrapper.find('header').text()).toContain('7');
  });
});

// ── 空态 ────────────────────────────────────────────────────────────────

describe('KanbanColumn 空态', () => {
  it('空列 → 0 卡片 + 空态文案', () => {
    const wrapper = mountColumn([]);

    expect(wrapper.findAll('article')).toHaveLength(0);
    expect(wrapper.text()).toContain('此列暂无任务');
    expect(wrapper.text()).not.toContain('松开以放置');
    expect(scroller(wrapper).children).toHaveLength(1);
  });

  it('空列 + dragOver → 切到「松开以放置」', () => {
    const wrapper = mountColumn([], { dragOver: true });

    expect(wrapper.text()).toContain('松开以放置');
    expect(wrapper.text()).not.toContain('此列暂无任务');
  });
});

// ── 事件透传 ─────────────────────────────────────────────────────────────

describe('KanbanColumn 事件透传', () => {
  const tasks = [makeTask({ slug: 'task-42', title: '带 slug 的任务' })];

  it('点击卡片标题 → open，带 slug', async () => {
    const wrapper = mountColumn(tasks);
    await wrapper.find('article button').trigger('click');

    expect(wrapper.emitted('open')?.at(-1)).toEqual(['task-42']);
  });

  it('点击推进 → cycle，带 slug', async () => {
    const wrapper = mountColumn(tasks);
    await wrapper.find('button[aria-label="推进状态"]').trigger('click');

    expect(wrapper.emitted('cycle')?.at(-1)).toEqual(['task-42']);
  });

  it('点击删除 → delete，带 slug', async () => {
    const wrapper = mountColumn(tasks);
    await wrapper.find('button[aria-label="删除"]').trigger('click');

    expect(wrapper.emitted('delete')?.at(-1)).toEqual(['task-42']);
  });

  it('卡片 dragstart / dragend → 透传出列', async () => {
    const wrapper = mountColumn(tasks);
    const card = wrapper.find('article');

    await card.trigger('dragstart');
    await card.trigger('dragend');

    expect(wrapper.emitted('dragstart')?.at(-1)).toEqual(['task-42']);
    expect(wrapper.emitted('dragend')).toBeTruthy();
  });

  it('列级 dragover / dragleave / drop → 透传出列', async () => {
    const wrapper = mountColumn(tasks);
    const section = wrapper.find('section');

    await section.trigger('dragover');
    await section.trigger('dragleave');
    await section.trigger('drop');

    expect(wrapper.emitted('dragover')).toHaveLength(1);
    expect(wrapper.emitted('dragleave')).toHaveLength(1);
    expect(wrapper.emitted('drop')).toHaveLength(1);
  });
});
