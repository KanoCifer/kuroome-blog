/**
 * KanbanPanel 渲染契约单测 —— 钉住「看板不再渲染已完成任务」这条需求。
 *
 * 覆盖:
 * - 只有 3 列（待办 / 进行中 / 已搁置），「已完成」整列消失，也不再是拖拽落点
 * - 已完成任务的标题根本不进 DOM，卡片总数 == 非已完成任务数
 * - 「待办」列吃掉 待评估 ∪ 待排期
 * - 筛选栏的「N 项」不把不会渲染的已完成卡片算进去
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { DevTask } from '@/features/todos/api';
import { useV3DevTaskStore } from '@/features/todos/stores/v3devtasks';
import KanbanPanel from '../KanbanPanel.vue';

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

function mountPanel(tasks: DevTask[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useV3DevTaskStore().tasks = tasks;

  return mount(KanbanPanel, {
    global: { plugins: [pinia], stubs: { transition: false } },
  });
}

const COLUMN_LABELS = ['待办', '进行中', '已搁置'];

// ── 列结构 ───────────────────────────────────────────────────────────────

describe('KanbanPanel 列结构', () => {
  it('只渲染 3 列，「已完成」整列不存在', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', title: '待评估的活', status: '待评估' }),
      makeTask({ slug: 'b', title: '待排期的活', status: '待排期' }),
      makeTask({ slug: 'c', title: '在做的活', status: '进行中' }),
      makeTask({ slug: 'd', title: '搁置的活', status: '已搁置' }),
      makeTask({ slug: 'e', title: '做完的活', status: '已完成' }),
    ]);

    const labels = wrapper
      .findAll('section header h3')
      .map((h) => h.text());
    expect(labels).toEqual(COLUMN_LABELS);
    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(3);
  });

  it('已完成任务不进 DOM，卡片总数 == 非已完成任务数', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', title: '待评估的活', status: '待评估' }),
      makeTask({ slug: 'b', title: '在做的活', status: '进行中' }),
      makeTask({ slug: 'c', title: '做完的活一', status: '已完成' }),
      makeTask({ slug: 'd', title: '做完的活二', status: '已完成' }),
    ]);

    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('做完的活一');
    expect(wrapper.text()).not.toContain('做完的活二');
  });

  it('「待办」列吃掉 待评估 ∪ 待排期', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', title: '待评估的活', status: '待评估' }),
      makeTask({ slug: 'b', title: '待排期的活', status: '待排期' }),
      makeTask({ slug: 'c', title: '在做的活', status: '进行中' }),
    ]);

    const [todo, doing, paused] = wrapper.findAll('[role="listitem"]');
    expect(todo.findAll('article')).toHaveLength(2);
    expect(doing.findAll('article')).toHaveLength(1);
    expect(paused.findAll('article')).toHaveLength(0);
  });

  it('列头计数 == 该列非已完成卡片数', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', status: '待评估' }),
      makeTask({ slug: 'b', status: '待排期' }),
      makeTask({ slug: 'c', status: '已完成' }),
      makeTask({ slug: 'd', status: '已完成' }),
    ]);

    const [todo] = wrapper.findAll('[role="listitem"]');
    expect(todo.find('header').text()).toBe('待办2');
  });
});

// ── 筛选栏计数口径 ───────────────────────────────────────────────────────

describe('KanbanPanel 筛选栏计数', () => {
  it('「N 项」排除已完成，与看板可见卡片数一致', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', status: '待评估' }),
      makeTask({ slug: 'b', status: '进行中' }),
      makeTask({ slug: 'c', status: '已搁置' }),
      makeTask({ slug: 'd', status: '已完成' }),
      makeTask({ slug: 'e', status: '已完成' }),
    ]);

    expect(wrapper.text()).toContain('3 项');
    expect(wrapper.findAll('article')).toHaveLength(3);
  });

  it('软删除任务既不计入计数也不渲染', () => {
    const wrapper = mountPanel([
      makeTask({ slug: 'a', status: '待评估' }),
      makeTask({ slug: 'b', status: '待评估', is_deleted: true }),
    ]);

    expect(wrapper.text()).toContain('1 项');
    expect(wrapper.findAll('article')).toHaveLength(1);
  });
});
