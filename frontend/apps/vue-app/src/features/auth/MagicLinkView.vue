<script setup lang="ts">
/**
 * MagicLinkView — 魔法链接消费落地页（接 handoff §2 接法 A）
 *
 * 流程：
 *  1. 用户在邮件里点 https://blog.kanocifer.chat/auth/magic?token=<64-hex>
 *  2. 浏览器落到这个路由，从 query.token 读出 token
 *  3. 调 POST /v3/magic-login 把 token 换成登录态
 *  4. 成功 → router.push 到 ?redirect= 或 '/'
 *  5. 失败 → 渲染对应错误页（401 过期 / 401 已用 / 404 用户注销 / 500 服务异常）
 */
import { AuthLayout } from './components';
import { Button, FieldError } from '@/components';
import { AlertTriangle, Check, Loader2 } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthenticate } from '@/features/auth';

const route = useRoute();
const router = useRouter();
const {
  errors,
  isMagicLinkConsuming,
  consumeMagicLink,
} = useAuthenticate();

type Status = 'pending' | 'success' | 'error-bad-token' | 'error-user-gone';
const status = ref<Status>('pending');

onMounted(async () => {
  const raw = route.query.token;
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!token) {
    status.value = 'error-bad-token';
    return;
  }
  const result = await consumeMagicLink(token);
  if (!result.ok) {
    // 区分 "token 无效/过期" 与 "用户被注销"
    const msg = errors.value.magicLink ?? '';
    status.value = msg.includes('用户不存在') ? 'error-user-gone' : 'error-bad-token';
  } else {
    status.value = 'success';
  }
});

const goRequest = () => router.push({ name: 'login' });
</script>

<template>
  <AuthLayout brand-width="w-3/5" form-width="lg:w-2/5">
    <template #branding>
      <div class="flex items-center gap-2 text-xl font-bold tracking-tight">
        <img
          src="/images/animal-badge/fox.png"
          alt="Fox"
          class="size-8 rounded-md object-cover"
        />
        <span>Kanocifer<span class="text-accent">.chat</span></span>
      </div>
      <div class="z-10 my-auto">
        <div class="flex flex-col">
          <h1 class="text-5xl font-extrabold tracking-tight xl:text-6xl">
            Welcome back to <br />
            the reading space.
          </h1>
          <p class="mt-6 max-w-md text-lg text-zinc-400">
            Discover, organize, and immerse yourself in all the great books you
            plan to read.
          </p>
        </div>
      </div>
      <div class="z-10 font-serif text-sm text-zinc-500">Kuroome's Blog</div>
    </template>

    <template #header>
      <div class="mb-8 flex flex-col items-center lg:items-start">
        <div
          class="bg-accent text-ink mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full shadow-[0_8px_16px_rgba(37,99,235,0.25)] lg:hidden"
        >
          <img
            src="/images/animal-badge/fox.png"
            alt="Fox"
            class="size-full object-cover"
          />
        </div>
        <h2
          class="font-headline text-ink text-center text-[28px] font-extrabold tracking-tight lg:text-left"
        >
          Magic link sign-in
        </h2>
        <p
          class="text-muted mt-2 text-center text-[15px] font-medium lg:text-left"
        >
          Verifying your one-time link…
        </p>
      </div>
    </template>

    <!-- ─── Pending ─── -->
    <div v-if="status === 'pending'" class="flex flex-col items-center text-center">
      <Loader2
        v-if="isMagicLinkConsuming"
        class="text-accent size-10 animate-spin"
        aria-hidden="true"
      />
      <p class="text-muted mt-4 text-sm">正在验证你的登录链接…</p>
    </div>

    <!-- ─── Success ─── -->
    <div v-else-if="status === 'success'" class="flex flex-col items-center text-center">
      <div
        class="bg-success/15 text-success mb-4 flex h-14 w-14 items-center justify-center rounded-full"
      >
        <Check class="size-7" />
      </div>
      <h3 class="font-headline text-2xl font-extrabold tracking-tight">
        登录成功
      </h3>
      <p class="text-muted mt-2 max-w-sm text-sm">
        正在带你回到阅读空间…
      </p>
    </div>

    <!-- ─── Error: token 非法/过期/已用 ─── -->
    <div v-else-if="status === 'error-bad-token'" class="flex flex-col items-center text-center">
      <div
        class="bg-destructive/15 text-destructive mb-4 flex h-14 w-14 items-center justify-center rounded-full"
      >
        <AlertTriangle class="size-7" />
      </div>
      <h3 class="font-headline text-2xl font-extrabold tracking-tight">
        链接已使用或已过期
      </h3>
      <p class="text-muted mt-2 max-w-sm text-sm">
        魔法链接只可使用一次且 10 分钟内有效。请重新申请一个新的链接。
      </p>
      <FieldError class="mt-4" :message="errors.magicLink" />
      <Button
        type="button"
        variant="default"
        @click="goRequest"
        class="!bg-accent !text-contrast mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
      >
        返回登录页申请新链接
      </Button>
    </div>

    <!-- ─── Error: 用户已注销 ─── -->
    <div v-else-if="status === 'error-user-gone'" class="flex flex-col items-center text-center">
      <div
        class="bg-destructive/15 text-destructive mb-4 flex h-14 w-14 items-center justify-center rounded-full"
      >
        <AlertTriangle class="size-7" />
      </div>
      <h3 class="font-headline text-2xl font-extrabold tracking-tight">
        账号已被注销
      </h3>
      <p class="text-muted mt-2 max-w-sm text-sm">
        对应账号已不存在。请联系管理员或注册新账号。
      </p>
      <FieldError class="mt-4" :message="errors.magicLink" />
      <Button
        type="button"
        variant="default"
        @click="goRequest"
        class="!bg-accent !text-contrast mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-2.5 font-bold shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
      >
        返回登录页
      </Button>
    </div>

    <template #footer>
      <div class="text-muted mt-8 text-center text-sm">
        Don't have an account?
        <RouterLink
          to="/register"
          class="hover:text-ink font-semibold underline transition duration-100"
        >
          Register here
        </RouterLink>
      </div>
    </template>
  </AuthLayout>
</template>