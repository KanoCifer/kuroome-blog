<script setup lang="ts">
/**
 * NomuLoginView — Nomu(NoonToolv1)无密码登录回调页
 *
 * 流程（接 handoff §2 接法 B）：
 *  1. 用户在邮件里点回调地址 https://<host>/nomu/login?token=<64-hex>:nomu
 *  2. 浏览器落到这个路由，从 query.token 读出参数（mode 段已嵌在 token 里）
 *  3. 调 authGateway.forwardNomuMagicLink({ token, mode: "nomu" })
 *     → POST /v3/nomu/magic-login（与 /magic-login/consume 同 handler，按 mode 字段分支）
 *  4. 后端把登录结果写到 device 槽位，扩展侧轮询获取最终登录结果
 *     （access_token / refresh_token / 用户信息）
 *  5. 本页只负责「转发成功 / 失败」的反馈，不落任何会话态
 */
import { AlertTriangle, Check, Loader2 } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { authGateway } from '@/features/auth/api';

const route = useRoute();

type Status = 'pending' | 'success' | 'error';
const status = ref<Status>('pending');
const message = ref('');

onMounted(async () => {
  const rawToken = route.query.token;
  const token = typeof rawToken === 'string' ? rawToken : '';

  if (!token) {
    status.value = 'error';
    message.value = '缺少 token，链接无效';
    return;
  }

  try {
    await authGateway.forwardNomuMagicLink({ token, mode: 'nomu' });
    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    message.value =
      err instanceof Error && err.message ? err.message : '登录确认失败，请返回扩展重试';
  }
});
</script>

<template>
  <div class="bg-page flex min-h-screen items-center justify-center p-8">
    <div
      class="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white/80 p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <!-- 转发中 -->
      <div v-if="status === 'pending'" class="flex flex-col items-center">
        <Loader2 class="text-accent size-10 animate-spin" aria-hidden="true" />
        <h3 class="font-headline text-ink mt-6 text-xl font-extrabold tracking-tight">
          正在确认登录…
        </h3>
        <p class="text-muted mt-2 text-sm">无需关闭此页面，稍后返回 Nomu 插件即可。</p>
      </div>

      <!-- 成功 -->
      <div v-else-if="status === 'success'" class="flex flex-col items-center">
        <div
          class="bg-success/15 text-success flex h-14 w-14 items-center justify-center rounded-full"
        >
          <Check class="size-7" />
        </div>
        <h3 class="font-headline text-ink mt-4 text-xl font-extrabold tracking-tight">
          登录已确认
        </h3>
        <p class="text-muted mt-2 text-sm">现在可以回到 Nomu 插件，登录结果将自动同步。</p>
      </div>

      <!-- 失败 -->
      <div v-else class="flex flex-col items-center">
        <div
          class="bg-destructive/15 text-destructive flex h-14 w-14 items-center justify-center rounded-full"
        >
          <AlertTriangle class="size-7" />
        </div>
        <h3 class="font-headline text-ink mt-4 text-xl font-extrabold tracking-tight">
          确认失败
        </h3>
        <p class="text-muted mt-2 text-sm">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
