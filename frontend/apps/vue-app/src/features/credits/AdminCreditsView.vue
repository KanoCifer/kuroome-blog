<script setup lang="ts">
import { Button, FieldError, BasicDetail } from '@/components';
import {
  creditsGateway,
  type AdminCreditTarget,
} from '@readinglist/api';
import { formatDate } from '@/lib/dayjs';
import { useNotificationStore } from '@/stores';
import { useAuthStore } from '@/features/auth';
import { isAxiosError } from 'axios';
import { Coins, RefreshCw, Search } from '@lucide/vue';
import { computed, onMounted, reactive, ref } from 'vue';
import type {
  CreditBalanceResponse,
  CreditTransactionsResponse,
  CreditTransactionView,
  GrantCreditRequest,
} from '@readinglist/types';

// ── types ──────────────────────────────────────────────────────────────

type TargetMode = 'user_id' | 'email';
type LocatorMode = 'user_id' | 'email';
type ViewerMode = 'self' | 'target';

interface GrantForm {
  user_id: number | null;
  email: string;
  amount: number | null;
  biz_id: string;
}

/** viewer 定位（查谁的流水/余额），与 grant 目标互不相干。 */
interface ViewerLocator {
  mode: LocatorMode;
  user_id: number | null;
  email: string;
}

/** resolveViewerTarget 的返回值：解析失败时 ok=false（不发请求、显示空态）。 */
interface ViewerTarget {
  ok: boolean;
  isSelf: boolean;
  query: AdminCreditTarget | null;
  /** 解析成功后用于标题/提示展示的定位串。 */
  label: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── state ──────────────────────────────────────────────────────────────

const notifier = useNotificationStore();
const auth = useAuthStore();

// 余额卡与流水都随 viewer 目标走：self=当前登录用户；target=按定位符查任意用户。
const viewerMode = ref<ViewerMode>('self');
const viewerLocator = reactive<ViewerLocator>({
  mode: 'user_id',
  user_id: null,
  email: '',
});

const balance = ref<CreditBalanceResponse | null>(null);

const transactions = ref<CreditTransactionView[]>([]);
const pagination = ref<CreditTransactionsResponse['pagination'] | null>(null);
const page = ref(1);
const perPage = 10;
const isListLoading = ref(false);
const listError = ref<string | null>(null);

// grant 表单独立于 viewer：默认按 user_id。
const targetMode = ref<TargetMode>('user_id');
const form = reactive<GrantForm>({
  user_id: null,
  email: '',
  amount: null,
  biz_id: '',
});
const fieldErrors = reactive<Record<keyof GrantForm, string | null>>({
  user_id: null,
  email: null,
  amount: null,
  biz_id: null,
});
const isSubmitting = ref(false);

// ── validators ─────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

function validate(): boolean {
  let ok = true;
  fieldErrors.user_id = null;
  fieldErrors.email = null;
  fieldErrors.amount = null;
  fieldErrors.biz_id = null;

  if (targetMode.value === 'user_id') {
    if (
      form.user_id === null ||
      Number.isNaN(form.user_id) ||
      form.user_id <= 0
    ) {
      fieldErrors.user_id = '请输入有效的用户 ID（正整数）';
      ok = false;
    }
  } else if (!isValidEmail(form.email.trim())) {
    fieldErrors.email = '请输入合法邮箱';
    ok = false;
  }

  if (
    form.amount === null ||
    Number.isNaN(form.amount) ||
    !Number.isFinite(form.amount) ||
    form.amount <= 0
  ) {
    fieldErrors.amount = '请输入大于 0 的金额（分）';
    ok = false;
  } else if (form.amount > 1e15) {
    fieldErrors.amount = '金额超出允许范围';
    ok = false;
  }

  if (form.biz_id && form.biz_id.length > 57) {
    // 服务端 MaxBizIDLen = 57（reserve 7 字符给 "refund:" / "settle:" 前缀）
    fieldErrors.biz_id = '幂等键长度不可超过 57 字符';
    ok = false;
  }

  return ok;
}

const canSubmit = computed(() => !isSubmitting.value && auth.isAdmin);

function switchTargetMode(mode: TargetMode) {
  if (targetMode.value === mode) return;
  targetMode.value = mode;
  // 切模式时清掉对方字段与其错误，避免残留值被提交。
  if (mode === 'email') {
    form.user_id = null;
    fieldErrors.user_id = null;
  } else {
    form.email = '';
    fieldErrors.email = null;
  }
}

// ── viewer 目标解析 ────────────────────────────────────────────────────

/** 按 viewerMode + viewerLocator 解析目标。target 未填定位 → ok=false。 */
function resolveViewerTarget(): ViewerTarget {
  if (viewerMode.value === 'self') {
    return { ok: true, isSelf: true, query: null, label: '' };
  }
  if (viewerLocator.mode === 'user_id') {
    const uid = viewerLocator.user_id;
    if (uid === null || Number.isNaN(uid) || uid <= 0) {
      return { ok: false, isSelf: false, query: null, label: '' };
    }
    return {
      ok: true,
      isSelf: false,
      query: { user_id: uid },
      label: `user_id: ${uid}`,
    };
  }
  const email = viewerLocator.email.trim();
  if (!isValidEmail(email)) {
    return { ok: false, isSelf: false, query: null, label: '' };
  }
  return {
    ok: true,
    isSelf: false,
    query: { email },
    label: email,
  };
}

const viewerTargetCtx = computed(() => resolveViewerTarget());

const balanceTitle = computed(() =>
  viewerMode.value === 'self' ? '当前账户余额' : '目标用户余额',
);

const balanceSubtitle = computed(() => {
  if (viewerMode.value === 'self') return '';
  return viewerTargetCtx.value.ok
    ? `目标：${viewerTargetCtx.value.label}`
    : '目标待指定';
});

// target 模式但定位未填 → 流水区空态文案。
const txEmptyHint = computed(() => {
  if (viewerMode.value === 'target' && !viewerTargetCtx.value.ok) {
    return '请输入定位方式（用户 ID 或邮箱）';
  }
  return '暂无流水';
});

function switchViewerMode(mode: ViewerMode) {
  if (viewerMode.value === mode) return;
  viewerMode.value = mode;
  page.value = 1;
  void refreshAll();
}

function switchViewerLocatorMode(mode: LocatorMode) {
  if (viewerLocator.mode === mode) return;
  viewerLocator.mode = mode;
}

function queryTarget() {
  page.value = 1;
  void refreshAll();
}

// ── data fetches ───────────────────────────────────────────────────────

async function fetchBalance() {
  const t = resolveViewerTarget();
  if (!t.ok) {
    balance.value = null;
    return;
  }
  try {
    balance.value = t.isSelf
      ? await creditsGateway.getBalance()
      : await creditsGateway.getBalanceFor(t.query as AdminCreditTarget);
  } catch {
    // 余额展示是辅助信息，失败不阻断主流程
    balance.value = null;
  }
}

async function fetchTransactions() {
  isListLoading.value = true;
  listError.value = null;
  const t = resolveViewerTarget();
  if (!t.ok) {
    transactions.value = [];
    pagination.value = null;
    isListLoading.value = false;
    return;
  }
  try {
    const res = t.isSelf
      ? await creditsGateway.listTransactions(page.value, perPage)
      : await creditsGateway.listTransactionsFor({
          ...(t.query as AdminCreditTarget),
          page: page.value,
          per_page: perPage,
        });
    transactions.value = res.items;
    pagination.value = res.pagination;
  } catch (err) {
    transactions.value = [];
    pagination.value = null;
    listError.value = extractErrorMessage(err, '加载流水失败');
  } finally {
    isListLoading.value = false;
  }
}

function goPage(next: number) {
  if (!pagination.value || next < 1 || next > pagination.value.pages) return;
  if (next === page.value) return;
  page.value = next;
  void fetchTransactions();
}

function refreshAll() {
  void Promise.all([fetchBalance(), fetchTransactions()]);
}

// ── submit ─────────────────────────────────────────────────────────────

async function handleSubmit() {
  if (!canSubmit.value) return;
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    let label = '';
    const payload: GrantCreditRequest = { amount: form.amount as number };
    if (targetMode.value === 'user_id') {
      payload.user_id = form.user_id as number;
      label = String(payload.user_id);
    } else {
      payload.email = form.email.trim();
      label = payload.email;
    }
    if (form.biz_id.trim()) payload.biz_id = form.biz_id.trim();

    const tx = await creditsGateway.grant(payload);
    notifier.success(`已为用户 ${label} 发放 ${tx.amount} 分`);

    // 重置表单（保留目标方便连续发）
    form.amount = null;
    form.biz_id = '';

    // 刷新：流水回到首页看新条；余额重取
    page.value = 1;
    await Promise.all([fetchBalance(), fetchTransactions()]);
  } catch (err) {
    applyServerError(err);
  } finally {
    isSubmitting.value = false;
  }
}

// ── error mapping ──────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message || data?.error || err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function applyServerError(err: unknown) {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const message = data?.message || data?.error || err.message;

    if (status === 400) {
      // 业务校验错误：尽量按字段映射，映射不到的退回 toast
      const msg = message ?? '';
      if (/user_id/i.test(msg)) fieldErrors.user_id = msg;
      else if (/email/i.test(msg)) fieldErrors.email = msg;
      else if (/amount/i.test(msg)) fieldErrors.amount = msg;
      else if (/biz_id/i.test(msg)) fieldErrors.biz_id = msg;
      else notifier.error(msg || '请求参数错误');
      return;
    }
    if (status === 403) {
      notifier.error('需要管理员权限');
      return;
    }
    notifier.error(message || '发放失败，请稍后再试');
    return;
  }
  notifier.error(extractErrorMessage(err, '发放失败'));
}

// ── display helpers ────────────────────────────────────────────────────

function formatAmount(n: number): string {
  return n.toFixed(2);
}

function signedAmount(t: CreditTransactionView): string {
  const sign = t.amount > 0 ? '+' : '';
  return `${sign}${formatAmount(t.amount)}`;
}

function amountClass(t: CreditTransactionView): string {
  return t.amount >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';
}

// ── lifecycle ──────────────────────────────────────────────────────────

onMounted(() => {
  if (!auth.isAdmin) {
    notifier.error('需要管理员权限');
    return;
  }
  refreshAll();
});
</script>

<template>
  <BasicDetail
    title="Admin · Credits"
    subtitle="管理员积分发放与流水查询（发放与查看的目标可独立按 user_id / email 指定）"
  >
    <div class="col-span-full mx-auto w-full max-w-6xl space-y-8">
      <!-- 顶部状态条：余额 + viewer 目标切换 -->
      <section
        class="bg-card text-card-foreground ring-border/60 space-y-4 rounded-2xl p-5 ring-1"
      >
        <div class="flex flex-wrap items-center gap-6">
          <div class="flex items-center gap-3">
            <span
              class="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-full"
            >
              <Coins :size="20" />
            </span>
            <div class="leading-tight">
              <div class="text-muted-foreground text-xs tracking-wide uppercase">
                {{ balanceTitle }}
              </div>
              <div class="font-family-averia text-2xl">
                {{ balance ? `${formatAmount(balance.balance)} 分` : '—' }}
              </div>
              <div
                v-if="viewerMode === 'target'"
                class="text-muted-foreground text-xs"
              >
                {{ balanceSubtitle }}
              </div>
            </div>
          </div>

          <div
            class="text-muted-foreground ml-auto flex flex-wrap items-center gap-2 text-sm"
          >
            <!-- viewer 范围切换 -->
            <div
              role="radiogroup"
              aria-label="查看范围"
              class="bg-muted/70 ring-border/60 inline-flex items-center gap-1 rounded-full p-1 ring-1"
            >
              <button
                type="button"
                role="radio"
                :aria-checked="viewerMode === 'self'"
                class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                :class="
                  viewerMode === 'self'
                    ? 'bg-accent text-contrast shadow-sm'
                    : 'hover:bg-surface hover:text-foreground'
                "
                @click="switchViewerMode('self')"
              >
                当前用户
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="viewerMode === 'target'"
                class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                :class="
                  viewerMode === 'target'
                    ? 'bg-accent text-contrast shadow-sm'
                    : 'hover:bg-surface hover:text-foreground'
                "
                @click="switchViewerMode('target')"
              >
                指定用户
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              :disabled="isListLoading"
              @click="refreshAll"
            >
              <RefreshCw :size="16" class="mr-1.5" />
              刷新
            </Button>
          </div>
        </div>

        <!-- 指定用户时：定位行（与 grant 表单模式独立） -->
        <div
          v-if="viewerMode === 'target'"
          class="border-border/40 flex flex-wrap items-center gap-2 border-t pt-3"
        >
          <div
            role="radiogroup"
            aria-label="定位方式"
            class="bg-muted/70 ring-border/60 inline-flex items-center gap-1 rounded-full p-0.5 ring-1"
          >
            <button
              type="button"
              role="radio"
              :aria-checked="viewerLocator.mode === 'user_id'"
              class="rounded-full px-2.5 py-0.5 text-xs transition-colors"
              :class="
                viewerLocator.mode === 'user_id'
                  ? 'bg-accent text-contrast shadow-sm'
                  : 'hover:bg-surface hover:text-foreground'
              "
              @click="switchViewerLocatorMode('user_id')"
            >
              按 ID
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="viewerLocator.mode === 'email'"
              class="rounded-full px-2.5 py-0.5 text-xs transition-colors"
              :class="
                viewerLocator.mode === 'email'
                  ? 'bg-accent text-contrast shadow-sm'
                  : 'hover:bg-surface hover:text-foreground'
              "
              @click="switchViewerLocatorMode('email')"
            >
              按邮箱
            </button>
          </div>

          <input
            v-if="viewerLocator.mode === 'user_id'"
            id="viewer-user-id"
            v-model.number="viewerLocator.user_id"
            type="number"
            min="1"
            step="1"
            class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] w-40 rounded-xl px-3 py-1.5 text-sm ring-1 outline-none focus:ring-2"
            placeholder="用户 ID，例如 1"
          />
          <input
            v-else
            id="viewer-email"
            v-model.trim="viewerLocator.email"
            type="email"
            maxlength="254"
            class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] w-64 rounded-xl px-3 py-1.5 text-sm ring-1 outline-none focus:ring-2"
            placeholder="目标邮箱"
          />

          <Button variant="outline" size="sm" @click="queryTarget">
            <Search :size="14" class="mr-1.5" />
            查询
          </Button>

          <span
            v-if="!viewerTargetCtx.ok"
            class="text-muted-foreground text-xs"
          >
            输入用户 ID 或邮箱后点查询
          </span>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <!-- 左侧：grant 表单 -->
        <section
          class="bg-card text-card-foreground ring-border/60 space-y-4 rounded-2xl p-5 ring-1"
        >
          <header class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-family-averia text-lg">发放积分</h2>
              <p class="text-muted-foreground text-xs">
                amount 单位：分（支持两位小数）。后端 ×100 转厘后写入流水。
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="发放目标方式"
              class="bg-muted/70 ring-border/60 inline-flex shrink-0 items-center gap-1 rounded-full p-0.5 ring-1"
            >
              <button
                type="button"
                role="radio"
                :aria-checked="targetMode === 'user_id'"
                class="rounded-full px-2.5 py-0.5 text-xs transition-colors"
                :class="
                  targetMode === 'user_id'
                    ? 'bg-accent text-contrast shadow-sm'
                    : 'hover:bg-surface hover:text-foreground'
                "
                @click="switchTargetMode('user_id')"
              >
                按 ID
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="targetMode === 'email'"
                class="rounded-full px-2.5 py-0.5 text-xs transition-colors"
                :class="
                  targetMode === 'email'
                    ? 'bg-accent text-contrast shadow-sm'
                    : 'hover:bg-surface hover:text-foreground'
                "
                @click="switchTargetMode('email')"
              >
                按邮箱
              </button>
            </div>
          </header>

          <form class="space-y-3" novalidate @submit.prevent="handleSubmit">
            <div v-if="targetMode === 'user_id'">
              <label
                for="grant-user-id"
                class="text-foreground/80 text-sm font-medium"
              >
                目标用户 ID <span class="text-destructive">*</span>
              </label>
              <input
                id="grant-user-id"
                v-model.number="form.user_id"
                type="number"
                min="1"
                step="1"
                required
                class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] mt-1 w-full rounded-xl px-3 py-2 text-sm ring-1 outline-none focus:ring-2"
                placeholder="例如：1"
              />
              <FieldError :message="fieldErrors.user_id" />
            </div>

            <div v-else>
              <label
                for="grant-email"
                class="text-foreground/80 text-sm font-medium"
              >
                目标邮箱 <span class="text-destructive">*</span>
              </label>
              <input
                id="grant-email"
                v-model.trim="form.email"
                type="email"
                maxlength="254"
                required
                class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] mt-1 w-full rounded-xl px-3 py-2 text-sm ring-1 outline-none focus:ring-2"
                placeholder="例如：user@example.com"
              />
              <FieldError :message="fieldErrors.email" />
            </div>

            <div>
              <label
                for="grant-amount"
                class="text-foreground/80 text-sm font-medium"
              >
                金额（分） <span class="text-destructive">*</span>
              </label>
              <input
                id="grant-amount"
                v-model.number="form.amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] mt-1 w-full rounded-xl px-3 py-2 text-sm ring-1 outline-none focus:ring-2"
                placeholder="例如：30 表示 0.30 元"
              />
              <FieldError :message="fieldErrors.amount" />
            </div>

            <div>
              <label
                for="grant-biz-id"
                class="text-foreground/80 text-sm font-medium"
              >
                幂等键（可选）
              </label>
              <input
                id="grant-biz-id"
                v-model="form.biz_id"
                type="text"
                maxlength="57"
                class="bg-background ring-border/60 text-foreground focus:ring-[var(--ring,theme(colors.primary/60))] mt-1 w-full rounded-xl px-3 py-2 text-sm ring-1 outline-none focus:ring-2"
                placeholder="留空由服务端生成 UUID"
              />
              <FieldError :message="fieldErrors.biz_id" />
            </div>

            <Button size="lg" type="submit" :disabled="!canSubmit">
              {{ isSubmitting ? '发放中…' : '发放积分' }}
            </Button>
          </form>
        </section>

        <!-- 右侧：流水表 -->
        <section
          class="bg-card text-card-foreground ring-border/60 space-y-4 rounded-2xl p-5 ring-1"
        >
          <header class="flex items-center justify-between">
            <h2 class="font-family-averia text-lg">最近流水</h2>
            <span class="text-muted-foreground text-xs">
              {{ viewerTargetCtx.ok && !viewerTargetCtx.isSelf
                ? viewerTargetCtx.label + ' · '
                : ''
              }}第 {{ page }} / {{ pagination?.pages ?? 1 }} 页
            </span>
          </header>

          <div
            v-if="listError"
            class="text-destructive bg-destructive/10 rounded-xl px-3 py-2 text-sm"
          >
            {{ listError }}
            <button
              class="ml-2 underline"
              type="button"
              @click="fetchTransactions()"
            >
              重试
            </button>
          </div>

          <div
            v-else-if="isListLoading"
            class="text-muted-foreground py-10 text-center text-sm"
          >
            加载中…
          </div>

          <div
            v-else-if="transactions.length === 0"
            class="text-muted-foreground py-10 text-center text-sm"
          >
            {{ txEmptyHint }}
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead
                class="text-muted-foreground text-xs tracking-wide uppercase"
              >
                <tr>
                  <th class="py-2 text-left font-medium">时间</th>
                  <th class="py-2 text-left font-medium">来源</th>
                  <th class="py-2 text-left font-medium">类型</th>
                  <th class="py-2 text-right font-medium">金额（分）</th>
                  <th class="py-2 text-right font-medium">余额（分）</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="tx in transactions"
                  :key="tx.id"
                  class="border-border/40 border-t"
                >
                  <td class="py-2 align-top whitespace-nowrap">
                    {{ formatDate(tx.created_at) }}
                  </td>
                  <td class="py-2 align-top">
                    <code
                      class="bg-muted text-foreground/80 rounded px-1.5 py-0.5 text-xs"
                    >
                      {{ tx.source }}
                    </code>
                  </td>
                  <td class="py-2 align-top">
                    {{ tx.type }}
                  </td>
                  <td
                    class="py-2 text-right align-top tabular-nums"
                    :class="amountClass(tx)"
                  >
                    {{ signedAmount(tx) }}
                  </td>
                  <td class="py-2 text-right align-top tabular-nums">
                    {{ formatAmount(tx.balance_after) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <nav
            v-if="pagination && pagination.pages > 1"
            class="flex items-center justify-center gap-2 pt-2"
          >
            <Button
              variant="outline"
              size="sm"
              :disabled="!pagination.has_prev"
              @click="goPage(page - 1)"
            >
              上一页
            </Button>
            <span class="text-muted-foreground text-xs">
              {{ page }} / {{ pagination.pages }}
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="!pagination.has_next"
              @click="goPage(page + 1)"
            >
              下一页
            </Button>
          </nav>
        </section>
      </div>
    </div>
  </BasicDetail>
</template>
