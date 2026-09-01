import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';

// ── mocks (hoisted before SUT import) ────────────────────────────────
const requestMagicLink = vi.fn();
const consumeMagicLink = vi.fn();
const loginMock = vi.fn();
const getPasskeyAuthenticationOptions = vi.fn();
const loginWithPasskey = vi.fn();
const loginWithMagicLinkStore = vi.fn();

vi.mock('@readinglist/api', () => ({
  authGateway: {
    requestMagicLink: (...args: unknown[]) => requestMagicLink(...args),
    consumeMagicLink: (...args: unknown[]) => consumeMagicLink(...args),
  },
}));

vi.mock('@/features/auth', () => ({
  authGateway: {
    requestMagicLink: (...args: unknown[]) => requestMagicLink(...args),
    consumeMagicLink: (...args: unknown[]) => consumeMagicLink(...args),
  },
  useAuthStore: () => ({
    login: (...args: unknown[]) => loginMock(...args),
    loginWithPasskey: (...args: unknown[]) => loginWithPasskey(...args),
    loginWithMagicLink: (...args: unknown[]) => loginWithMagicLinkStore(...args),
    getPasskeyAuthenticationOptions: (...args: unknown[]) =>
      getPasskeyAuthenticationOptions(...args),
  }),
}));

const pushMock = vi.fn();
const routeQuery: Record<string, string> = {};
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: (...args: unknown[]) => pushMock(...args) }),
}));

import { useAuthenticate } from '../useAuthenticate';

describe('useAuthenticate — magic-link', () => {
  beforeEach(() => {
    requestMagicLink.mockReset();
    consumeMagicLink.mockReset();
    loginMock.mockReset();
    loginWithPasskey.mockReset();
    loginWithMagicLinkStore.mockReset();
    pushMock.mockReset();
    for (const k of Object.keys(routeQuery)) delete routeQuery[k];
  });

  describe('handleRequestMagicLink', () => {
    it('空邮箱直接走客户端校验，不打后端', async () => {
      const { handleRequestMagicLink, errors, magicLinkSentTo } = useAuthenticate();
      await handleRequestMagicLink('');
      expect(errors.value.email).toMatch(/合法的邮箱/);
      expect(magicLinkSentTo.value).toBeNull();
      expect(requestMagicLink).not.toHaveBeenCalled();
    });

    it('邮箱格式非法走客户端校验', async () => {
      const { handleRequestMagicLink, errors } = useAuthenticate();
      await handleRequestMagicLink('not-an-email');
      expect(errors.value.email).toMatch(/合法的邮箱/);
      expect(requestMagicLink).not.toHaveBeenCalled();
    });

    it('合法邮箱 → 调用网关 + 把脱敏后的邮箱写入 sentTo', async () => {
      requestMagicLink.mockResolvedValue({ code: 0, data: null });
      const { handleRequestMagicLink, magicLinkSentTo, errors } = useAuthenticate();
      await handleRequestMagicLink('alice@example.com');
      // 落地页固定 mode='blog'，让后端拼 kanocifer.chat SPA 链接。
      // 扩展（NoonToolv1）在自己 client.ts 里固定传 mode='nomu'。
      expect(requestMagicLink).toHaveBeenCalledWith({
        email: 'alice@example.com',
        mode: 'blog',
      });
      expect(magicLinkSentTo.value).toBe('a****@example.com');
      expect(errors.value.email).toBeUndefined();
    });

    it('enumeration-safe：即使网关成功但响应异常，也只把"已发送"提示给用户', async () => {
      requestMagicLink.mockResolvedValue({ code: 0, data: null });
      const { handleRequestMagicLink, magicLinkSentTo } = useAuthenticate();
      await handleRequestMagicLink('never-registered@example.com');
      // 即使邮箱不存在，前端也无差别提示发送成功
      // maskEmail：保留首字符 'n'，其余 15 字符变 '*'
      expect(magicLinkSentTo.value).toBe('n***************@example.com');
    });

    it('后端错误时把 message 落到 errors.email', async () => {
      requestMagicLink.mockRejectedValue(new Error('请求过于频繁，请稍后再试'));
      const { handleRequestMagicLink, errors } = useAuthenticate();
      await handleRequestMagicLink('alice@example.com');
      expect(errors.value.email).toMatch(/频繁/);
    });
  });

  describe('consumeMagicLink', () => {
    it('空 token 直接拒绝', async () => {
      const { consumeMagicLink, errors } = useAuthenticate();
      const r = await consumeMagicLink('');
      expect(r.ok).toBe(false);
      expect(errors.value.magicLink).toMatch(/链接格式错误/);
      expect(loginWithMagicLinkStore).not.toHaveBeenCalled();
    });

    it('成功 → 调 store.loginWithMagicLink 并 push 到 redirect 或 /', async () => {
      loginWithMagicLinkStore.mockResolvedValue({ id: 1 });
      const { consumeMagicLink } = useAuthenticate();
      const r = await consumeMagicLink('a'.repeat(64));
      expect(loginWithMagicLinkStore).toHaveBeenCalledWith('a'.repeat(64));
      expect(r.ok).toBe(true);
      expect(pushMock).toHaveBeenCalledWith('/');
    });

    it('成功 → redirect query 优先', async () => {
      loginWithMagicLinkStore.mockResolvedValue({ id: 1 });
      routeQuery.redirect = '/settings';
      const { consumeMagicLink } = useAuthenticate();
      await consumeMagicLink('a'.repeat(64));
      expect(pushMock).toHaveBeenCalledWith('/settings');
    });

    it('失败 → 不 push，把 message 写入 errors.magicLink', async () => {
      loginWithMagicLinkStore.mockRejectedValue(
        new Error('魔法链接无效或已过期'),
      );
      const { consumeMagicLink, errors } = useAuthenticate();
      const r = await consumeMagicLink('a'.repeat(64));
      expect(r.ok).toBe(false);
      expect(errors.value.magicLink).toMatch(/无效或已过期/);
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  describe('resetMagicLinkSent', () => {
    it('清空 magicLinkSentTo', async () => {
      requestMagicLink.mockResolvedValue({ code: 0, data: null });
      const { handleRequestMagicLink, resetMagicLinkSent, magicLinkSentTo } =
        useAuthenticate();
      await handleRequestMagicLink('alice@example.com');
      expect(magicLinkSentTo.value).not.toBeNull();
      resetMagicLinkSent();
      await nextTick();
      expect(magicLinkSentTo.value).toBeNull();
    });
  });
});

describe('maskEmail (via sentTo)', () => {
  it('短用户名：保留首字符 + 至少 3 个星号', async () => {
    requestMagicLink.mockResolvedValue({ code: 0, data: null });
    const { handleRequestMagicLink, magicLinkSentTo } = useAuthenticate();
    await handleRequestMagicLink('ab@example.com');
    expect(magicLinkSentTo.value).toBe('a***@example.com');
  });
});