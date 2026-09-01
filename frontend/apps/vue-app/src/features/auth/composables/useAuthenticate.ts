import { useAuthStore } from '@/features/auth';
import { authGateway } from '@/features/auth/api';
import type { LoginForm } from '@readinglist/types';
import { startAuthentication } from '@simplewebauthn/browser';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 邮箱魔法登录 — 把 "alice@example.com" 脱敏成 "a***@example.com" 给 UI 用 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  const head = user.slice(0, 1);
  const tail = '*'.repeat(Math.max(user.length - 1, 3));
  return `${head}${tail}@${domain}`;
}

/** 把后端错误码映射到 UI 文案（遵循 handoff §4 错误响应表） */
function magicLinkErrorMessage(err: unknown): string {
  // axios 错误兜底由 apiClient 的拦截器把 message 写好，这里只用 message 兜底
  if (err instanceof Error && err.message) return err.message;
  return '魔法链接无效或已过期，请重新申请';
}

export function useAuthenticate() {
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();
  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);
  const isPasskeySubmitting = ref(false);
  const isMagicLinkRequesting = ref(false);
  const isMagicLinkConsuming = ref(false);
  const magicLinkSentTo = ref<string | null>(null);

  // 处理登录表单提交
  const handleSubmit = async (form: LoginForm) => {
    errors.value = {};
    isSubmitting.value = true;

    if (!form.username) {
      errors.value.username = '用户名不能为空';
    }
    if (!form.password) {
      errors.value.password = '密码不能为空';
    }
    if (errors.value.username || errors.value.password) {
      isSubmitting.value = false;
      return;
    }

    try {
      await auth.login(form.username, form.password);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    } catch {
      errors.value.password = '用户名或密码错误';
    } finally {
      isSubmitting.value = false;
    }
  };

  // Passkey 登录
  const handlePasskeyLogin = async () => {
    errors.value = {};
    isPasskeySubmitting.value = true;

    try {
      // 获取认证选项
      const options = await auth.getPasskeyAuthenticationOptions();

      // 调用浏览器 Passkey 认证
      const assertion = await startAuthentication({
        optionsJSON: options,
      });
      await auth.loginWithPasskey(assertion);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    } catch {
      errors.value.passkey = '登录失败，请稍后重试';
    } finally {
      isPasskeySubmitting.value = false;
    }
  };

  // GitHub 登录
  const handleGitHubLogin = () => {
    // 直接跳转到后端 GitHub 授权接口，后端会处理后续流程
    auth.loginWithGitHub();
  };

  /**
   * 邮箱魔法登录 — 申请邮件。
   * 成功永远 200，错误也只可能是 400（邮箱格式错）或 429（限流）。
   * 前端不做额外节流。
   */
  const handleRequestMagicLink = async (email: string) => {
    errors.value = {};
    if (!email || !EMAIL_RE.test(email)) {
      errors.value.email = '请输入合法的邮箱地址';
      return;
    }
    isMagicLinkRequesting.value = true;
    try {
      // 落地页固定 mode='blog'：让后端拼 kanocifer.chat SPA 链接。
      // 扩展（NoonToolv1）在自己 client.ts 里固定传 mode='nomu'，互不干扰。
      await authGateway.requestMagicLink({ email, mode: 'blog' });
      // enumeration-safe：永远"成功"，不管邮箱是否注册
      magicLinkSentTo.value = maskEmail(email);
    } catch (err) {
      // 400 由拦截器已经友好化为 message；429 拦截器也覆盖
      errors.value.email = magicLinkErrorMessage(err);
    } finally {
      isMagicLinkRequesting.value = false;
    }
  };

  /**
   * 邮箱魔法登录 — 消费 token（用户在邮件里点链接落到 /auth/magic 时调用）。
   * 401/404/500 由拦截器友好化，本函数只负责把成功路径走完。
   */
  const consumeMagicLink = async (token: string) => {
    errors.value = {};
    if (!token) {
      errors.value.magicLink = '链接格式错误';
      return { ok: false as const };
    }
    isMagicLinkConsuming.value = true;
    try {
      await auth.loginWithMagicLink(token);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
      return { ok: true as const };
    } catch (err) {
      errors.value.magicLink = magicLinkErrorMessage(err);
      return { ok: false as const };
    } finally {
      isMagicLinkConsuming.value = false;
    }
  };

  /** 重置 "邮件已发送" 提示，回到输入态（例如用户点 "用其他邮箱"） */
  const resetMagicLinkSent = () => {
    magicLinkSentTo.value = null;
  };

  return {
    errors,
    isSubmitting,
    isPasskeySubmitting,
    isMagicLinkRequesting,
    isMagicLinkConsuming,
    magicLinkSentTo,
    handleSubmit,
    handlePasskeyLogin,
    handleGitHubLogin,
    handleRequestMagicLink,
    consumeMagicLink,
    resetMagicLinkSent,
  };
}
