<script setup lang="ts">
/**
 * NomuLoginView — Nomu无密码登录回调页
 *
 * 流程（接 handoff §2 接法 B）：
 *  1. 用户在邮件里点回调地址 https://<host>/nomu/login?token=<64-hex>:nomu
 *  2. 浏览器落到这个路由，从 query.token 读出参数（mode 段已嵌在 token 里）
 *  3. 调 authGateway.forwardNomuMagicLink({ token, mode: "nomu" })
 *     → POST /v3/nomu/magic-login（与 /magic-login/consume 同 handler，按 mode 字段分支）
 *  4. 后端把登录结果写到 device 槽位，扩展侧轮询获取最终登录结果
 *     （access_token / refresh_token / 用户信息）
 *  5. 本页只负责「转发成功 / 失败」的反馈，不落任何会话态
 *
 * 文案：跟随浏览器语言（zh-* → zh-CN，其他 → en），缺省回落英文。
 *      来自后端的 `err.message` 保留原文（服务端一般返回英文错误码）。
 *
 * 视觉：apple-design prototype 选定的 Bloom 方向 — 巨幅 SF Symbol,
 * 顶部 status pill, 28px/700 标题, 背景柔和径向光晕。
 */
import { AlertTriangle, Check, Loader2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { authGateway } from '@/features/auth/api';

const { t } = useI18n();
const route = useRoute();

type Status = 'pending' | 'success' | 'error';
const status = ref<Status>('pending');
const message = ref('');

const headline = computed(() => {
  if (status.value === 'pending') return t('noonTool.nomuLogin.headlinePending');
  if (status.value === 'success') return t('noonTool.nomuLogin.headlineSuccess');
  return t('noonTool.nomuLogin.headlineError');
});

const subline = computed(() => {
  if (status.value === 'pending') return t('noonTool.nomuLogin.sublinePending');
  if (status.value === 'success') return t('noonTool.nomuLogin.sublineSuccess');
  return message.value || t('noonTool.nomuLogin.sublineFallbackError');
});

onMounted(async () => {
  const rawToken = route.query.token;
  const token = typeof rawToken === 'string' ? rawToken : '';

  if (!token) {
    status.value = 'error';
    message.value = t('noonTool.nomuLogin.missingTokenError');
    return;
  }

  try {
    await authGateway.forwardNomuMagicLink({ token, mode: 'nomu' });
    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    message.value = err instanceof Error && err.message ? err.message : '';
  }
});

/**
 * 用户已经在 Nomu 扩展内走完流程,关掉这个确认 tab 即可。
 * `window.close()` 在由脚本而非用户手势打开的窗口上会被浏览器拒绝,
 * 这里只对扩展侧 `chrome.tabs` 打开的回调 tab 调用,确保行为一致。
 */
function closePage(): void {
  window.close();
}

/** 失败时允许用户重试,直接刷新当前路由。 */
function retry(): void {
  location.reload();
}
</script>

<template>
  <div class="bloom-root">
    <div class="bloom-stage">
      <!-- 巨幅 SF Symbol -->
      <div class="bloom-glyph-wrap" :data-phase="status">
        <div class="bloom-glyph">
          <Loader2
            v-if="status === 'pending'"
            class="bloom-icon bloom-icon-spin"
          />
          <Check v-else-if="status === 'success'" class="bloom-icon" />
          <AlertTriangle v-else class="bloom-icon" />
        </div>
        <div class="bloom-glow"></div>
      </div>

      <h1 class="bloom-headline">{{ headline }}</h1>
      <p class="bloom-subline">{{ subline }}</p>

      <!-- success 状态:返回 Nomu 的 CTA -->
      <button
        v-if="status === 'success'"
        class="bloom-btn bloom-btn-secondary"
        type="button"
        @click="closePage"
      >
        {{ t('noonTool.nomuLogin.closePage') }}
      </button>

      <!-- error 状态:重试链接 -->
      <button
        v-else-if="status === 'error'"
        class="bloom-btn bloom-btn-primary"
        type="button"
        @click="retry"
      >
        {{ t('noonTool.nomuLogin.retry') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bloom-root {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC',
    system-ui, sans-serif;
  background: var(--color-page);
}

.bloom-stage {
  width: min(480px, 100%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Glyph — 巨幅,带柔和径向光晕 */
.bloom-glyph-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  display: grid;
  place-items: center;
  margin-bottom: 40px;
  animation: bloom-glyph-in 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.bloom-glyph-wrap[data-phase='success'] {
  animation: bloom-glyph-pop 720ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.bloom-glyph {
  width: 120px;
  height: 120px;
  border-radius: 32px;
  display: grid;
  place-items: center;
  color: #007aff;
  background: radial-gradient(
    circle at 30% 28%,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85) 40%,
    rgba(235, 240, 255, 0.9) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -2px 8px rgba(0, 0, 0, 0.04) inset,
    0 30px 60px -20px rgba(0, 122, 255, 0.32),
    0 12px 32px -8px rgba(0, 122, 255, 0.18);
  position: relative;
  z-index: 1;
}
.bloom-glyph-wrap[data-phase='success'] .bloom-glyph {
  color: #34c759;
  background: radial-gradient(
    circle at 30% 28%,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85) 40%,
    rgba(225, 245, 230, 0.9) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -2px 8px rgba(0, 0, 0, 0.04) inset,
    0 30px 60px -20px rgba(52, 199, 89, 0.34),
    0 12px 32px -8px rgba(52, 199, 89, 0.18);
}
.bloom-glyph-wrap[data-phase='error'] .bloom-glyph {
  color: #ff3b30;
  background: radial-gradient(
    circle at 30% 28%,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85) 40%,
    rgba(255, 230, 228, 0.9) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -2px 8px rgba(0, 0, 0, 0.04) inset,
    0 30px 60px -20px rgba(255, 59, 48, 0.34),
    0 12px 32px -8px rgba(255, 59, 48, 0.18);
}

/* 背后柔光 */
.bloom-glow {
  position: absolute;
  inset: -40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.18), transparent 65%);
  filter: blur(28px);
  z-index: 0;
  opacity: 0;
  animation: bloom-glow-in 1200ms cubic-bezier(0.4, 0, 0.2, 1) 200ms forwards;
}
.bloom-glyph-wrap[data-phase='success'] .bloom-glow {
  background: radial-gradient(circle, rgba(52, 199, 89, 0.18), transparent 65%);
}
.bloom-glyph-wrap[data-phase='error'] .bloom-glow {
  background: radial-gradient(circle, rgba(255, 59, 48, 0.18), transparent 65%);
}

.bloom-icon {
  width: 72px;
  height: 72px;
  stroke-width: 1.6;
}
.bloom-icon-spin {
  animation: bloom-spin 1.4s linear infinite;
}

@keyframes bloom-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes bloom-glyph-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes bloom-glyph-pop {
  0% {
    opacity: 0;
    transform: scale(0.7) rotate(-6deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.06) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
@keyframes bloom-glow-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bloom-glyph-wrap,
  .bloom-glyph,
  .bloom-glow,
  .bloom-icon-spin {
    animation: none !important;
  }
}

/* 标题 / 副标 */
.bloom-headline {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.024em;
  line-height: 1.18;
  color: var(--color-ink);
  animation: bloom-fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) 160ms both;
}
.bloom-subline {
  margin: 12px 0 0;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: -0.005em;
  color: color-mix(in srgb, var(--color-ink) 55%, transparent);
  max-width: 380px;
  animation: bloom-fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both;
}
@keyframes bloom-fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 按钮 */
.bloom-btn {
  margin-top: 36px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  padding: 11px 22px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  transition:
    background-color 180ms ease-out,
    transform 120ms ease-out,
    filter 180ms ease-out;
  animation: bloom-fade-up 600ms cubic-bezier(0.16, 1, 0.3, 1) 360ms both;
}
.bloom-btn:active {
  transform: scale(0.985);
}
.bloom-btn-primary {
  background: #007aff;
  color: white;
  font-weight: 600;
}
.bloom-btn-primary:hover {
  background: #0a84ff;
}
.bloom-btn-secondary {
  background: color-mix(in srgb, var(--color-ink) 7%, transparent);
  color: var(--color-ink);
}
.bloom-btn-secondary:hover {
  background: color-mix(in srgb, var(--color-ink) 11%, transparent);
}
</style>
