/**
 * AdminCreditsView 单测 — task-555 / task-561。
 *
 * 覆盖 (表单提交主路径 + 错误反馈 + 邮箱/指定用户路径):
 *  - 挂载即请求余额 + 流水
 *  - 合法表单 → creditsGateway.grant 被调且参数正确 → 流水刷新
 *  - amount<=0 → 前端字段错误阻止提交，无网络请求
 *  - 后端 400 → notification.error 被调用
 *  - 后端 403 → notification.error 被调用（权限不足）
 *  - 切到邮箱模式 → grant payload 含 email 不含 user_id
 *  - 切到指定用户 + 邮箱 → 流水走 listTransactionsFor、余额走 getBalanceFor
 *  - 非法邮箱 → 前端阻止提交，无网络请求
 *
 * mock 策略：替换 @readinglist/api 的 creditsGateway；
 * 替换 @/stores 的 useNotificationStore（仅捕获 success/error）；
 * 替换 @/features/auth 的 useAuthStore（强制 isAdmin = true）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AdminCreditsView from '../AdminCreditsView.vue';

// ── mock gateway ────────────────────────────────────────────────────────
// vi.hoisted ensures these vi.fn() exist before the vi.mock factory runs
// (vi.mock is hoisted to the top of the file by Vitest's transformer).
const { grantMock, listTransactionsMock, getBalanceMock, listTransactionsForMock, getBalanceForMock } = vi.hoisted(() => ({
  grantMock: vi.fn(),
  listTransactionsMock: vi.fn(),
  getBalanceMock: vi.fn(),
  listTransactionsForMock: vi.fn(),
  getBalanceForMock: vi.fn(),
}));

vi.mock('@readinglist/api', () => ({
  creditsGateway: {
    grant: grantMock,
    listTransactions: listTransactionsMock,
    getBalance: getBalanceMock,
    listTransactionsFor: listTransactionsForMock,
    getBalanceFor: getBalanceForMock,
  },
}));

// ── mock notification store ─────────────────────────────────────────────
const notifierMock = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock('@/stores', () => ({
  useNotificationStore: () => notifierMock,
}));

// ── mock auth store ─────────────────────────────────────────────────────
vi.mock('@/features/auth', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    isAuthenticated: true,
    isHydrated: true,
    user: { id: 1, is_admin: true, username: 'admin' },
  }),
}));

// ── fixtures ────────────────────────────────────────────────────────────
const BALANCE_OK = { balance: 12.34, total_spent: 5 };
const LIST_OK = {
  items: [
    {
      id: 1,
      source: 'admin_grant',
      biz_id: 'b1',
      type: 'grant',
      amount: 30,
      balance_after: 30,
      meta: {},
      created_at: '2026-09-07T00:00:00Z',
    },
  ],
  pagination: { page: 1, per_page: 10, total: 1, pages: 1, has_prev: false, has_next: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  getBalanceMock.mockResolvedValue(BALANCE_OK);
  listTransactionsMock.mockResolvedValue(LIST_OK);
  listTransactionsForMock.mockResolvedValue(LIST_OK);
  getBalanceForMock.mockResolvedValue(BALANCE_OK);
  grantMock.mockResolvedValue({
    id: 2,
    source: 'admin_grant',
    biz_id: 'b2',
    type: 'grant',
    amount: 30,
    balance_after: 60,
    meta: {},
    created_at: '2026-09-07T00:00:01Z',
  });
});

// ── helpers ─────────────────────────────────────────────────────────────

/** 在指定 aria-label 的 radiogroup 里点击文案匹配的 radio 按钮。 */
async function clickRadio(
  wrapper: ReturnType<typeof mount>,
  groupLabel: string,
  label: string,
) {
  const group = wrapper.find(`[aria-label="${groupLabel}"]`);
  expect(group.exists()).toBe(true);
  const btn = group
    .findAll('button')
    .find((b) => b.text().trim() === label);
  expect(btn, `radio "${label}" in "${groupLabel}"`).toBeTruthy();
  await btn!.trigger('click');
}

// ── tests ───────────────────────────────────────────────────────────────
describe('AdminCreditsView', () => {
  it('mount → 自动请求余额与流水', async () => {
    mount(AdminCreditsView);
    await flushPromises();

    expect(getBalanceMock).toHaveBeenCalledTimes(1);
    expect(listTransactionsMock).toHaveBeenCalledTimes(1);
    expect(listTransactionsMock).toHaveBeenCalledWith(1, 10);
  });

  it('合法表单 → grant 被调 + 流水刷新', async () => {
    const wrapper = mount(AdminCreditsView);
    await flushPromises();
    vi.clearAllMocks();

    await wrapper.find('#grant-user-id').setValue(1);
    await wrapper.find('#grant-amount').setValue(30);
    await wrapper.find('#grant-biz-id').setValue('order-42');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(grantMock).toHaveBeenCalledTimes(1);
    expect(grantMock).toHaveBeenCalledWith({
      user_id: 1,
      amount: 30,
      biz_id: 'order-42',
    });

    expect(notifierMock.success).toHaveBeenCalledTimes(1);
    // 提交后 page 应回到 1，流水与余额都被重取
    expect(listTransactionsMock).toHaveBeenCalledWith(1, 10);
    expect(getBalanceMock).toHaveBeenCalledTimes(1);
  });

  it('amount<=0 → 前端阻止提交，无网络请求', async () => {
    const wrapper = mount(AdminCreditsView);
    await flushPromises();
    vi.clearAllMocks();

    await wrapper.find('#grant-user-id').setValue(1);
    await wrapper.find('#grant-amount').setValue(0);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(grantMock).not.toHaveBeenCalled();
    expect(notifierMock.error).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('大于 0');
  });

  it('后端 400 → 字段错误映射到 amount', async () => {
    grantMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: 'amount must be greater than zero' },
      },
    });

    const wrapper = mount(AdminCreditsView);
    await flushPromises();

    await wrapper.find('#grant-user-id').setValue(1);
    await wrapper.find('#grant-amount').setValue(5);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(grantMock).toHaveBeenCalledTimes(1);
    // 字段错误（FieldError 渲染在视图里）应包含服务端 message
    expect(wrapper.text()).toContain('amount must be greater than zero');
  });

  it('后端 403 → notification.error("需要管理员权限")', async () => {
    grantMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403, data: { message: 'Admin access required' } },
    });

    const wrapper = mount(AdminCreditsView);
    await flushPromises();

    await wrapper.find('#grant-user-id').setValue(1);
    await wrapper.find('#grant-amount').setValue(10);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(notifierMock.error).toHaveBeenCalledWith('需要管理员权限');
  });

  it('切到邮箱模式 → grant payload 含 email、不含 user_id', async () => {
    const wrapper = mount(AdminCreditsView);
    await flushPromises();
    vi.clearAllMocks();

    await clickRadio(wrapper, '发放目标方式', '按邮箱');

    // user_id 输入框隐藏、邮箱框出现
    expect(wrapper.find('#grant-user-id').exists()).toBe(false);
    await wrapper.find('#grant-email').setValue('alice@example.com');
    await wrapper.find('#grant-amount').setValue(30);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(grantMock).toHaveBeenCalledTimes(1);
    expect(grantMock).toHaveBeenCalledWith({
      email: 'alice@example.com',
      amount: 30,
    });
    // 未携带 user_id
    const payload = grantMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty('user_id');
    expect(notifierMock.success).toHaveBeenCalledTimes(1);
  });

  it('切到指定用户 + 邮箱 → 流水走 listTransactionsFor、余额走 getBalanceFor', async () => {
    const wrapper = mount(AdminCreditsView);
    await flushPromises();
    vi.clearAllMocks();

    await clickRadio(wrapper, '查看范围', '指定用户');
    await clickRadio(wrapper, '定位方式', '按邮箱');
    await wrapper.find('#viewer-email').setValue('bob@example.com');
    await wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '查询')
      ?.trigger('click');
    await flushPromises();

    expect(getBalanceForMock).toHaveBeenCalledTimes(1);
    expect(getBalanceForMock).toHaveBeenCalledWith({ email: 'bob@example.com' });
    expect(listTransactionsForMock).toHaveBeenCalledTimes(1);
    expect(listTransactionsForMock).toHaveBeenCalledWith({
      email: 'bob@example.com',
      page: 1,
      per_page: 10,
    });
    // self 路径不再被调
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(listTransactionsMock).not.toHaveBeenCalled();
  });

  it('非法邮箱 → 前端阻止提交，无网络请求', async () => {
    const wrapper = mount(AdminCreditsView);
    await flushPromises();
    vi.clearAllMocks();

    await clickRadio(wrapper, '发放目标方式', '按邮箱');
    await wrapper.find('#grant-email').setValue('not-an-email');
    await wrapper.find('#grant-amount').setValue(10);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(grantMock).not.toHaveBeenCalled();
    expect(notifierMock.error).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('请输入合法邮箱');
  });
});
