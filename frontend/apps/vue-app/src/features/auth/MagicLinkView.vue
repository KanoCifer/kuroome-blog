<script setup lang="ts">
/**
 * MagicLinkView — 魔法链接消费落地页（接 handoff §2 接法 A）
 *
 * 流程：
 *  1. 用户在邮件里点 https://blog.kanocifer.chat/auth/magic?token=<64-hex>
 *  2. 浏览器落到这个路由，从 query.token 读出 token
 *  3. 调 POST /v3/magic-login/consume 把 token 换成登录态（mode=blog，写 refresh cookie + 返 LoginResult）
 *  4. 成功 → 停在原页展示结果，由用户点「关闭此页」（或自行离开）继续浏览
 *  5. 失败 → 渲染对应错误页（401 过期 / 401 已用 / 404 用户注销 / 500 服务异常）
 *
 * 成功不自动跳转：这一步已经拿到登录态（access token 在内存、refresh token 在
 * HttpOnly cookie），直接跳走会让用户看不清发生了什么 —— 与 NomuLanding 的
 * /nomu/login 回调页保持一致。
 */
import { FieldError } from '@/components';
import { AlertTriangle, Check, Loader2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthenticate, useAuthStore } from '@/features/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { errors, isMagicLinkConsuming, consumeMagicLink } = useAuthenticate();

type Status = 'pending' | 'success' | 'error-bad-token' | 'error-user-gone';
const status = ref<Status>('pending');

const headline = computed(() => {
  if (status.value === 'pending') return '正在验证登录链接';
  if (status.value === 'success') return '登录成功';
  if (status.value === 'error-user-gone') return '账号已被注销';
  return '链接已使用或已过期';
});

const subline = computed(() => {
  if (status.value === 'pending') return '正在和服务器确认这次登录…';
  if (status.value === 'success') {
    const who = auth.user?.name || auth.user?.username;
    return `${who ? `${who}，` : ''}可以关闭此页，回到站点继续浏览。`;
  }
  if (status.value === 'error-user-gone') {
    return '对应账号已不存在。请联系管理员或注册新账号。';
  }
  return '魔法链接只可使用一次且 10 分钟内有效。请重新申请一个新的链接。';
});

onMounted(async () => {
  const raw = route.query.token;
  const token =
    typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!token) {
    status.value = 'error-bad-token';
    return;
  }
  const result = await consumeMagicLink(token);
  if (!result.ok) {
    // 区分 "token 无效/过期" 与 "用户被注销"
    const msg = errors.value.magicLink ?? '';
    status.value = msg.includes('用户不存在')
      ? 'error-user-gone'
      : 'error-bad-token';
  } else {
    status.value = 'success';
  }
});

const goRequest = () => router.push({ name: 'login' });
const retry = () => location.reload();

/**
 * 用户已经登录完成，关掉这个确认 tab 即可。
 * window.close() 在由脚本而非用户手势打开的窗口上会被浏览器拒绝，
 * 这里只对邮件客户端打开的回调 tab 调用，确保行为一致。
 */
const closePage = () => window.close();
</script>

<template>
  <div
    class="bg-page grid min-h-[calc(100dvh-8rem)] place-items-center px-6 py-12"
  >
    <div
      class="animate-in fade-in zoom-in-95 flex w-full max-w-sm flex-col items-center text-center duration-300 motion-reduce:animate-none"
      aria-live="polite"
    >
      <!-- 巨幅 glyph，带柔和光晕 -->
      <div
        class="relative mb-8 grid size-32 place-items-center rounded-full"
        :class="{
          'bg-accent/20 text-accent': status === 'pending',
          'bg-success/15 text-success': status === 'success',
          'bg-destructive/15 text-destructive': status.startsWith('error'),
        }"
      >
        <span
          class="absolute inset-0 rounded-full blur-2xl"
          :class="{
            'bg-accent/25': status === 'pending',
            'bg-success/25': status === 'success',
            'bg-destructive/25': status.startsWith('error'),
          }"
          aria-hidden="true"
        />
        <Loader2
          v-if="status === 'pending'"
          class="relative size-14 animate-spin"
          :class="{ 'opacity-40': !isMagicLinkConsuming }"
          aria-hidden="true"
        />
        <Check
          v-else-if="status === 'success'"
          class="relative size-14"
          aria-hidden="true"
        />
        <AlertTriangle v-else class="relative size-14" aria-hidden="true" />
      </div>

      <h1
        class="font-headline text-ink text-[28px] font-extrabold tracking-tight"
      >
        {{ headline }}
      </h1>
      <p class="text-muted mt-3 text-sm leading-relaxed">{{ subline }}</p>
      <FieldError class="mt-4" :message="errors.magicLink" />

      <!-- pending：无操作；success：关掉这个 tab 即完成 -->
      <template v-if="status === 'success'">
        <button
          type="button"
          class="bg-accent text-contrast hover:bg-accent/90 mt-8 inline-flex w-full cursor-pointer items-center justify-center rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="closePage"
        >
          关闭此页
        </button>
        <RouterLink
          to="/"
          class="text-muted hover:text-ink mt-4 text-sm underline transition-colors"
        >
          或继续浏览站点
        </RouterLink>
      </template>

      <template v-else-if="status.startsWith('error')">
        <button
          type="button"
          class="bg-accent text-contrast hover:bg-accent/90 mt-8 inline-flex w-full cursor-pointer items-center justify-center rounded-xl px-8 py-2.5 font-bold shadow-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          @click="goRequest"
        >
          返回登录页申请新链接
        </button>
        <button
          type="button"
          class="text-muted hover:text-ink mt-4 text-sm underline transition-colors"
          @click="retry"
        >
          再试一次
        </button>
      </template>
    </div>
  </div>
</template>
