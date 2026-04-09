<template>
  <div class="mx-auto my-24 w-full max-w-[1360px] px-4 pb-20 sm:px-6 xl:px-8">
    <section
      class="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-7 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/85"
    >
      <div
        class="pointer-events-none absolute -top-24 right-[-120px] h-64 w-64 rounded-full bg-linear-to-br from-sky-300/50 to-indigo-500/40 blur-3xl dark:from-sky-500/20 dark:to-indigo-400/25"
      />
      <div
        class="pointer-events-none absolute -bottom-20 left-[-80px] h-56 w-56 rounded-full bg-linear-to-tr from-emerald-300/45 to-cyan-400/40 blur-3xl dark:from-emerald-400/20 dark:to-cyan-500/20"
      />

      <div class="relative flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-3xl">
          <p class="mb-2 text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">Subscription</p>
          <h1 class="font-serif text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white">订阅管理中心</h1>
          <p class="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            统一管理订阅信息、计费节奏和提醒渠道。页面针对电脑宽屏布局优化，支持高密度信息浏览。
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            :disabled="isLoading || isRefreshing"
            class="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            @click="fetchSubscriptions"
          >
            {{ isRefreshing ? "刷新中..." : "刷新列表" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-xl bg-linear-to-r from-indigo-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-sky-400"
            @click="openAddModal"
          >
            新增订阅
          </button>
        </div>
      </div>

      <div class="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
          <p class="text-xs text-slate-500 dark:text-slate-400">总订阅数</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{{ subscriptions.length }}</p>
        </article>
        <article class="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-900/20">
          <p class="text-xs text-emerald-700 dark:text-emerald-300">活跃订阅</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{{ activeCount }}</p>
        </article>
        <article class="rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4 dark:border-indigo-500/30 dark:bg-indigo-900/20">
          <p class="text-xs text-indigo-700 dark:text-indigo-300">月度估算</p>
          <p class="mt-2 text-2xl font-semibold text-indigo-700 dark:text-indigo-300">${{ monthlyEstimate.toFixed(2) }}</p>
        </article>
        <article class="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-900/20">
          <p class="text-xs text-amber-700 dark:text-amber-300">7 天内到期</p>
          <p class="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">{{ dueSoonCount }}</p>
        </article>
      </div>
    </section>

    <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
      <section class="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
        <header class="mb-3 flex items-center justify-between gap-3 px-2">
          <h2 class="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">订阅列表</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ sortedSubscriptions.length }} 项</p>
        </header>

        <div
          v-if="errorMessage"
          class="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
        >
          {{ errorMessage }}
        </div>

        <div v-if="isLoading" class="space-y-3">
          <div
            v-for="idx in 5"
            :key="idx"
            class="h-18 animate-pulse rounded-2xl border border-slate-200/70 bg-slate-100/80 dark:border-slate-700/70 dark:bg-slate-800/80"
          />
        </div>

        <div
          v-else-if="sortedSubscriptions.length === 0"
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
        >
          还没有订阅记录，点击「新增订阅」开始管理。
        </div>

        <div v-else class="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <table class="min-w-[920px] table-fixed text-left text-sm">
            <thead class="bg-slate-50/90 dark:bg-slate-800/80">
              <tr class="text-xs tracking-wide text-slate-500 uppercase dark:text-slate-400">
                <th class="px-4 py-3 font-medium">订阅</th>
                <th class="px-4 py-3 font-medium">价格</th>
                <th class="px-4 py-3 font-medium">周期</th>
                <th class="px-4 py-3 font-medium">下次扣费</th>
                <th class="px-4 py-3 font-medium">状态</th>
                <th class="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="subscription in sortedSubscriptions"
                :key="subscription.id"
                class="cursor-pointer border-t border-slate-200/80 transition hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-800/70"
                :class="selectedSubId === subscription.id ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''"
                @click="selectedSubId = subscription.id"
              >
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-900 dark:text-white">{{ subscription.name }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ subscription.provider }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-800 dark:text-slate-200">
                    {{ formatPrice(subscription.price, subscription.currency) }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ subscription.currency }}</div>
                </td>
                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ getCycleLabel(subscription.billing_cycle) }}</td>
                <td class="px-4 py-3">
                  <div class="text-slate-700 dark:text-slate-300">{{ toDateInputValue(subscription.next_billing_date) }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">剩余 {{ getDaysUntil(subscription.next_billing_date) }} 天</div>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="getStatusMeta(subscription.status).badgeClass"
                  >
                    <span class="mr-1 h-1.5 w-1.5 rounded-full" :class="getStatusMeta(subscription.status).dotClass" />
                    {{ getStatusMeta(subscription.status).label }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      @click.stop="openEditModal(subscription)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                      @click.stop="openReminderModal(subscription)"
                    >
                      通知
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      :disabled="pendingStatusId === subscription.id"
                      @click.stop="handleToggleStatus(subscription)"
                    >
                      {{ subscription.status === "active" ? "暂停" : "恢复" }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="xl:sticky xl:top-24 xl:h-fit">
        <div class="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
          <h2 class="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">详情面板</h2>

          <div v-if="selectedSubscription" class="mt-4 space-y-4">
            <div>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-white">{{ selectedSubscription.name }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ selectedSubscription.provider }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
                <p class="text-xs text-slate-500 dark:text-slate-400">价格</p>
                <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {{ formatPrice(selectedSubscription.price, selectedSubscription.currency) }}
                </p>
              </div>
              <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
                <p class="text-xs text-slate-500 dark:text-slate-400">周期</p>
                <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {{ getCycleLabel(selectedSubscription.billing_cycle) }}
                </p>
              </div>
              <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
                <p class="text-xs text-slate-500 dark:text-slate-400">下次扣费</p>
                <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {{ toDateInputValue(selectedSubscription.next_billing_date) }}
                </p>
              </div>
              <div class="rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/80">
                <p class="text-xs text-slate-500 dark:text-slate-400">更新时间</p>
                <p class="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {{ formatDate(selectedSubscription.updated_at) }}
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <p class="text-xs text-slate-500 dark:text-slate-400">提醒配置</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                渠道：{{ getReminderChannelsText(selectedSubscription.reminder_config) }}
              </p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                节点：{{ getReminderPointsText(selectedSubscription.reminder_config) }}
              </p>
            </div>

            <div
              class="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
            >
              {{ selectedSubscription.notes?.trim() || "暂无备注" }}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                @click="openEditModal(selectedSubscription)"
              >
                编辑订阅
              </button>
              <button
                type="button"
                class="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                @click="openReminderModal(selectedSubscription)"
              >
                通知配置
              </button>
              <button
                type="button"
                class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                :disabled="pendingStatusId === selectedSubscription.id"
                @click="handleToggleStatus(selectedSubscription)"
              >
                {{ selectedSubscription.status === "active" ? "暂停订阅" : "恢复订阅" }}
              </button>
              <button
                type="button"
                class="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                :disabled="deletePendingId === selectedSubscription.id"
                @click="handleDeleteSubscription(selectedSubscription)"
              >
                删除订阅
              </button>
            </div>
          </div>

          <div
            v-else
            class="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400"
          >
            从左侧列表中选择一条订阅以查看详情。
          </div>
        </div>
      </aside>
    </div>
  </div>

  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          aria-label="关闭弹窗"
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          @click="isAddModalOpen = false"
        />
        <section class="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">新增订阅</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">创建新的订阅记录，默认状态为进行中。</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="isAddModalOpen = false"
            >
              关闭
            </button>
          </header>

          <form class="space-y-4" @submit.prevent="handleCreateSubscription">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">订阅名称</span>
                <input
                  v-model="createForm.name"
                  type="text"
                  placeholder="例如：Spotify Premium"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">服务商</span>
                <input
                  v-model="createForm.provider"
                  type="text"
                  placeholder="例如：Spotify"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">价格</span>
                <input
                  v-model="createForm.price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">币种</span>
                <input
                  v-model="createForm.currency"
                  type="text"
                  list="subscription-currency-options-add"
                  maxlength="10"
                  placeholder="例如：USD / CNY / 元"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <datalist id="subscription-currency-options-add">
                  <option v-for="currency in currencySuggestions" :key="currency" :value="currency" />
                </datalist>
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">计费周期</span>
                <select
                  v-model="createForm.billing_cycle"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option v-for="cycle in cycleOptions" :key="cycle.value" :value="cycle.value">
                    {{ cycle.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">下次扣费日期</span>
              <input
                v-model="createForm.next_billing_date"
                type="date"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">备注</span>
              <textarea
                v-model="createForm.notes"
                rows="3"
                placeholder="可选备注，例如套餐人数、自动续费规则等。"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <p v-if="addFormError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {{ addFormError }}
            </p>

            <footer class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="isAddModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isCreating"
                class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isCreating ? "创建中..." : "确认创建" }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </teleport>

  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          aria-label="关闭弹窗"
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          @click="isEditModalOpen = false"
        />
        <section class="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">编辑订阅</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">更新订阅信息、状态和账单日期。</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="isEditModalOpen = false"
            >
              关闭
            </button>
          </header>

          <form class="space-y-4" @submit.prevent="handleUpdateSubscription">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">订阅名称</span>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">服务商</span>
                <input
                  v-model="editForm.provider"
                  type="text"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">价格</span>
                <input
                  v-model="editForm.price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">币种</span>
                <input
                  v-model="editForm.currency"
                  type="text"
                  list="subscription-currency-options-edit"
                  maxlength="10"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <datalist id="subscription-currency-options-edit">
                  <option v-for="currency in currencySuggestions" :key="currency" :value="currency" />
                </datalist>
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">计费周期</span>
                <select
                  v-model="editForm.billing_cycle"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option v-for="cycle in cycleOptions" :key="cycle.value" :value="cycle.value">
                    {{ cycle.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">下次扣费日期</span>
                <input
                  v-model="editForm.next_billing_date"
                  type="date"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">状态</span>
                <select
                  v-model="editForm.status"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">备注</span>
              <textarea
                v-model="editForm.notes"
                rows="3"
                class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <p
              v-if="editFormError"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ editFormError }}
            </p>

            <footer class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="isEditModalOpen = false"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isUpdating"
                class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isUpdating ? "保存中..." : "保存更改" }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </teleport>

  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isReminderModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          aria-label="关闭弹窗"
          class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          @click="isReminderModalOpen = false"
        />
        <section class="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">通知渠道配置</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">选择通知渠道和提醒触发时间点，可先发送测试通知。</p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="isReminderModalOpen = false"
            >
              关闭
            </button>
          </header>

          <div class="space-y-4">
            <section>
              <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">通知渠道</p>
              <div class="grid gap-2 sm:grid-cols-3">
                <button
                  v-for="channel in channelOptions"
                  :key="channel.value"
                  type="button"
                  class="rounded-xl border px-3 py-2 text-sm transition"
                  :class="
                    reminderForm.channels.includes(channel.value)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  "
                  @click="toggleReminderChannel(channel.value)"
                >
                  {{ channel.label }}
                </button>
              </div>
            </section>

            <section>
              <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">提醒时间点</p>
              <div class="grid gap-2 sm:grid-cols-3">
                <label
                  v-for="point in reminderPointOptions"
                  :key="point.key"
                  class="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <input
                    v-model="reminderForm[point.key]"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 dark:border-slate-500"
                  />
                  {{ point.label }}
                </label>
              </div>
            </section>

            <section class="grid gap-3">
              <label v-if="reminderForm.channels.includes('email')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">邮箱地址（Email）</span>
                <input
                  v-model="reminderForm.email"
                  type="email"
                  placeholder="name@example.com"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label v-if="reminderForm.channels.includes('feishu')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">飞书 Webhook URL</span>
                <input
                  v-model="reminderForm.feishu_webhook_url"
                  type="text"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label v-if="reminderForm.channels.includes('bark')" class="space-y-1">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Bark Device Key</span>
                <input
                  v-model="reminderForm.bark_device_key"
                  type="text"
                  placeholder="请输入 Bark 设备 Key"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </section>

            <div
              v-if="reminderTestResult"
              class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <p class="mb-2 font-medium">测试结果</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(success, channel) in reminderTestResult"
                  :key="channel"
                  class="rounded-full px-2.5 py-1"
                  :class="
                    success
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                  "
                >
                  {{ channel }}: {{ success ? "成功" : "失败" }}
                </span>
              </div>
            </div>

            <p
              v-if="reminderFormError"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {{ reminderFormError }}
            </p>

            <footer class="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="isReminderModalOpen = false"
              >
                取消
              </button>
              <button
                type="button"
                :disabled="isTestingReminder"
                class="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                @click="handleTestNotification"
              >
                {{ isTestingReminder ? "测试中..." : "发送测试通知" }}
              </button>
              <button
                type="button"
                :disabled="isSavingReminder"
                class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                @click="handleSaveReminderConfig"
              >
                {{ isSavingReminder ? "保存中..." : "保存配置" }}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import type { AxiosError } from "axios";
import {
  type CreateSubscriptionPayload,
  type Subscription,
  type TestNotificationPayload,
  type UpdateSubscriptionPayload,
} from "@/api/subscriptionGateway";
import { subscriptionService } from "@/service/subscriptionService";
import { useNotificationStore } from "@/stores/notification";
import { formatDate } from "@/utils/formatdate";
import { computed, onMounted, reactive, ref } from "vue";

interface SubscriptionFormState {
  name: string;
  provider: string;
  price: string;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  status: string;
  notes: string;
}

interface ReminderFormState {
  channels: string[];
  days_30: boolean;
  days_7: boolean;
  days_3: boolean;
  days_1: boolean;
  day_of: boolean;
  email: string;
  feishu_webhook_url: string;
  bark_device_key: string;
}

const cycleOptions = [
  { value: "monthly", label: "月付" },
  { value: "quarterly", label: "季付" },
  { value: "yearly", label: "年付" },
  { value: "weekly", label: "周付" },
  { value: "daily", label: "日付" },
];

const statusOptions = [
  { value: "active", label: "进行中" },
  { value: "paused", label: "已暂停" },
  { value: "canceled", label: "已取消" },
  { value: "expired", label: "已过期" },
];

const channelOptions = [
  { value: "email", label: "邮件" },
  { value: "feishu", label: "飞书" },
  { value: "bark", label: "Bark" },
];

const reminderPointOptions: Array<{ key: keyof Pick<ReminderFormState, "days_30" | "days_7" | "days_3" | "days_1" | "day_of">; label: string }> =
  [
    { key: "days_30", label: "提前 30 天" },
    { key: "days_7", label: "提前 7 天" },
    { key: "days_3", label: "提前 3 天" },
    { key: "days_1", label: "提前 1 天" },
    { key: "day_of", label: "当天提醒" },
  ];

const currencySuggestions = ["USD", "CNY", "EUR", "JPY", "HKD", "GBP"];

const notifier = useNotificationStore();

const subscriptions = ref<Subscription[]>([]);
const isLoading = ref<boolean>(false);
const isRefreshing = ref<boolean>(false);
const errorMessage = ref<string>("");
const selectedSubId = ref<number | null>(null);

const isAddModalOpen = ref<boolean>(false);
const isEditModalOpen = ref<boolean>(false);
const isReminderModalOpen = ref<boolean>(false);

const createForm = reactive<SubscriptionFormState>(createDefaultSubscriptionForm());
const editForm = reactive<SubscriptionFormState>(createDefaultSubscriptionForm());
const reminderForm = reactive<ReminderFormState>(createDefaultReminderForm());

const editTargetId = ref<number | null>(null);
const reminderTargetId = ref<number | null>(null);

const addFormError = ref<string>("");
const editFormError = ref<string>("");
const reminderFormError = ref<string>("");

const isCreating = ref<boolean>(false);
const isUpdating = ref<boolean>(false);
const isSavingReminder = ref<boolean>(false);
const isTestingReminder = ref<boolean>(false);
const pendingStatusId = ref<number | null>(null);
const deletePendingId = ref<number | null>(null);

const reminderTestResult = ref<Record<string, boolean> | null>(null);

const sortedSubscriptions = computed<Subscription[]>(() =>
  [...subscriptions.value].sort((a, b) => {
    const aTime = new Date(a.next_billing_date).getTime();
    const bTime = new Date(b.next_billing_date).getTime();
    return aTime - bTime;
  }),
);

const selectedSubscription = computed<Subscription | null>(() => {
  if (selectedSubId.value === null) return null;
  return subscriptions.value.find((item) => item.id === selectedSubId.value) ?? null;
});

const activeCount = computed<number>(() => subscriptions.value.filter((item) => item.status === "active").length);

const monthlyEstimate = computed<number>(() =>
  subscriptions.value
    .filter((item) => item.status === "active")
    .reduce((total, item) => total + getMonthlyEstimate(item), 0),
);

const dueSoonCount = computed<number>(() =>
  subscriptions.value.filter((item) => item.status === "active" && getDaysUntil(item.next_billing_date) <= 7).length,
);

function getDefaultNextBillingDate(): string {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const day = String(nextMonth.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  if (match) return match[0];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultSubscriptionForm(): SubscriptionFormState {
  return {
    name: "",
    provider: "",
    price: "",
    currency: "USD",
    billing_cycle: "monthly",
    next_billing_date: getDefaultNextBillingDate(),
    status: "active",
    notes: "",
  };
}

function createDefaultReminderForm(): ReminderFormState {
  return {
    channels: [],
    days_30: false,
    days_7: true,
    days_3: false,
    days_1: true,
    day_of: true,
    email: "",
    feishu_webhook_url: "",
    bark_device_key: "",
  };
}

function createReminderFormState(config: Record<string, unknown> | null): ReminderFormState {
  const reminderConfig = config ?? {};
  return {
    channels: toStringArray(reminderConfig.channels),
    days_30: Boolean(reminderConfig.days_30),
    days_7: Boolean(reminderConfig.days_7),
    days_3: Boolean(reminderConfig.days_3),
    days_1: Boolean(reminderConfig.days_1),
    day_of: reminderConfig.day_of === undefined ? true : Boolean(reminderConfig.day_of),
    email: typeof reminderConfig.email === "string" ? reminderConfig.email : "",
    feishu_webhook_url: typeof reminderConfig.feishu_webhook_url === "string" ? reminderConfig.feishu_webhook_url : "",
    bark_device_key: typeof reminderConfig.bark_device_key === "string" ? reminderConfig.bark_device_key : "",
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getMonthlyEstimate(subscription: Subscription): number {
  const price = Number(subscription.price) || 0;
  switch (subscription.billing_cycle) {
    case "yearly":
      return price / 12;
    case "quarterly":
      return price / 3;
    case "weekly":
      return (price * 52) / 12;
    case "daily":
      return price * 30;
    default:
      return price;
  }
}

function getDaysUntil(dateValue: string): number {
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

function getCycleLabel(cycle: string): string {
  const matched = cycleOptions.find((option) => option.value === cycle);
  return matched?.label ?? cycle;
}

function getStatusMeta(status: string): { label: string; dotClass: string; badgeClass: string } {
  switch (status) {
    case "paused":
      return {
        label: "已暂停",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      };
    case "canceled":
      return {
        label: "已取消",
        dotClass: "bg-red-500",
        badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
      };
    case "expired":
      return {
        label: "已过期",
        dotClass: "bg-slate-500",
        badgeClass: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
      };
    default:
      return {
        label: "进行中",
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      };
  }
}

function formatPrice(price: number, currency: string): string {
  const upperCurrency = currency.toUpperCase();
  if (upperCurrency === "CNY" || upperCurrency === "RMB") {
    return `¥${price.toFixed(2)}`;
  }
  if (upperCurrency === "USD") {
    return `$${price.toFixed(2)}`;
  }
  if (upperCurrency === "EUR") {
    return `€${price.toFixed(2)}`;
  }
  return `${currency} ${price.toFixed(2)}`;
}

function extractErrorMessage(error: unknown, fallbackMessage: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? (error instanceof Error ? error.message : fallbackMessage);
}

function validateSubscriptionForm(form: SubscriptionFormState): string | null {
  const name = form.name.trim();
  const provider = form.provider.trim();
  if (!name || !provider) {
    return "请填写订阅名称和服务商。";
  }

  const price = Number.parseFloat(form.price);
  if (!Number.isFinite(price) || price <= 0) {
    return "请输入大于 0 的价格。";
  }

  const currency = form.currency.trim();
  if (!currency) {
    return "请输入货币单位。";
  }
  if (currency.length > 10) {
    return "货币单位长度不能超过 10 个字符。";
  }
  if (!form.next_billing_date) {
    return "请选择下次扣费日期。";
  }
  return null;
}

function toCreatePayload(form: SubscriptionFormState): CreateSubscriptionPayload {
  return {
    name: form.name.trim(),
    provider: form.provider.trim(),
    price: Number.parseFloat(form.price),
    currency: form.currency.trim(),
    billing_cycle: form.billing_cycle,
    next_billing_date: form.next_billing_date,
    status: "active",
    notes: form.notes.trim() || null,
  };
}

function toUpdatePayload(form: SubscriptionFormState): UpdateSubscriptionPayload {
  return {
    name: form.name.trim(),
    provider: form.provider.trim(),
    price: Number.parseFloat(form.price),
    currency: form.currency.trim(),
    billing_cycle: form.billing_cycle,
    next_billing_date: form.next_billing_date,
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

function createReminderPayload(form: ReminderFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    channels: form.channels,
    days_30: form.days_30,
    days_7: form.days_7,
    days_3: form.days_3,
    days_1: form.days_1,
    day_of: form.day_of,
  };

  const email = form.email.trim();
  const feishuWebhookUrl = form.feishu_webhook_url.trim();
  const barkDeviceKey = form.bark_device_key.trim();
  if (email) payload.email = email;
  if (feishuWebhookUrl) payload.feishu_webhook_url = feishuWebhookUrl;
  if (barkDeviceKey) payload.bark_device_key = barkDeviceKey;

  return payload;
}

function hasEnabledReminderPoint(form: ReminderFormState): boolean {
  return form.days_30 || form.days_7 || form.days_3 || form.days_1 || form.day_of;
}

function getReminderChannelsText(config: Record<string, unknown> | null): string {
  const channels = toStringArray(config?.channels);
  if (channels.length === 0) return "未配置";
  return channels.join("、");
}

function getReminderPointsText(config: Record<string, unknown> | null): string {
  if (!config) return "未配置";
  const points: string[] = [];
  if (Boolean(config.days_30)) points.push("提前 30 天");
  if (Boolean(config.days_7)) points.push("提前 7 天");
  if (Boolean(config.days_3)) points.push("提前 3 天");
  if (Boolean(config.days_1)) points.push("提前 1 天");
  if (config.day_of === undefined || Boolean(config.day_of)) points.push("当天");
  return points.length > 0 ? points.join("、") : "未配置";
}

function applyFormValues(target: SubscriptionFormState, source: SubscriptionFormState): void {
  target.name = source.name;
  target.provider = source.provider;
  target.price = source.price;
  target.currency = source.currency;
  target.billing_cycle = source.billing_cycle;
  target.next_billing_date = source.next_billing_date;
  target.status = source.status;
  target.notes = source.notes;
}

function applyReminderFormValues(target: ReminderFormState, source: ReminderFormState): void {
  target.channels = [...source.channels];
  target.days_30 = source.days_30;
  target.days_7 = source.days_7;
  target.days_3 = source.days_3;
  target.days_1 = source.days_1;
  target.day_of = source.day_of;
  target.email = source.email;
  target.feishu_webhook_url = source.feishu_webhook_url;
  target.bark_device_key = source.bark_device_key;
}

function mapSubscriptionToForm(subscription: Subscription): SubscriptionFormState {
  return {
    name: subscription.name,
    provider: subscription.provider,
    price: String(subscription.price),
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
    next_billing_date: toDateInputValue(subscription.next_billing_date),
    status: subscription.status,
    notes: subscription.notes ?? "",
  };
}

function upsertSubscription(updated: Subscription): void {
  subscriptions.value = subscriptions.value.map((item) => (item.id === updated.id ? updated : item));
}

async function fetchSubscriptions(): Promise<void> {
  errorMessage.value = "";
  const showSkeleton = subscriptions.value.length === 0;
  if (showSkeleton) {
    isLoading.value = true;
  } else {
    isRefreshing.value = true;
  }
  try {
    const data = await subscriptionService.getSubscriptions();
    subscriptions.value = data;
    if (data.length === 0) {
      selectedSubId.value = null;
      return;
    }
    const selectedStillExists = selectedSubId.value !== null && data.some((item) => item.id === selectedSubId.value);
    if (!selectedStillExists) {
      selectedSubId.value = data[0].id;
    }
  } catch (error) {
    const message = extractErrorMessage(error, "加载订阅列表失败，请稍后重试。");
    errorMessage.value = message;
    notifier.error(message);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

function openAddModal(): void {
  addFormError.value = "";
  applyFormValues(createForm, createDefaultSubscriptionForm());
  isAddModalOpen.value = true;
}

async function handleCreateSubscription(): Promise<void> {
  addFormError.value = "";
  const validationError = validateSubscriptionForm(createForm);
  if (validationError) {
    addFormError.value = validationError;
    return;
  }

  isCreating.value = true;
  try {
    const created = await subscriptionService.createSubscription(toCreatePayload(createForm));
    subscriptions.value = [created, ...subscriptions.value];
    selectedSubId.value = created.id;
    isAddModalOpen.value = false;
    notifier.success("订阅创建成功");
  } catch (error) {
    addFormError.value = extractErrorMessage(error, "创建订阅失败，请稍后重试。");
  } finally {
    isCreating.value = false;
  }
}

function openEditModal(subscription: Subscription): void {
  editTargetId.value = subscription.id;
  editFormError.value = "";
  applyFormValues(editForm, mapSubscriptionToForm(subscription));
  isEditModalOpen.value = true;
}

async function handleUpdateSubscription(): Promise<void> {
  if (editTargetId.value === null) return;
  editFormError.value = "";
  const validationError = validateSubscriptionForm(editForm);
  if (validationError) {
    editFormError.value = validationError;
    return;
  }

  isUpdating.value = true;
  try {
    const updated = await subscriptionService.updateSubscription(editTargetId.value, toUpdatePayload(editForm));
    upsertSubscription(updated);
    isEditModalOpen.value = false;
    notifier.success("订阅信息已更新");
  } catch (error) {
    editFormError.value = extractErrorMessage(error, "更新订阅失败，请稍后重试。");
  } finally {
    isUpdating.value = false;
  }
}

function openReminderModal(subscription: Subscription): void {
  reminderTargetId.value = subscription.id;
  reminderFormError.value = "";
  reminderTestResult.value = null;
  applyReminderFormValues(reminderForm, createReminderFormState(subscription.reminder_config));
  isReminderModalOpen.value = true;
}

function toggleReminderChannel(channel: string): void {
  const hasChannel = reminderForm.channels.includes(channel);
  reminderForm.channels = hasChannel
    ? reminderForm.channels.filter((item) => item !== channel)
    : [...reminderForm.channels, channel];
}

async function handleSaveReminderConfig(): Promise<void> {
  if (reminderTargetId.value === null) return;
  reminderFormError.value = "";
  if (reminderForm.channels.length === 0) {
    reminderFormError.value = "请至少选择一个通知渠道。";
    return;
  }
  if (!hasEnabledReminderPoint(reminderForm)) {
    reminderFormError.value = "请至少选择一个提醒时间点。";
    return;
  }

  isSavingReminder.value = true;
  try {
    const updated = await subscriptionService.updateReminders(reminderTargetId.value, createReminderPayload(reminderForm));
    upsertSubscription(updated);
    isReminderModalOpen.value = false;
    notifier.success("通知配置已保存");
  } catch (error) {
    reminderFormError.value = extractErrorMessage(error, "保存通知配置失败，请稍后重试。");
  } finally {
    isSavingReminder.value = false;
  }
}

async function handleTestNotification(): Promise<void> {
  if (reminderTargetId.value === null) return;
  reminderFormError.value = "";
  reminderTestResult.value = null;

  if (reminderForm.channels.length === 0) {
    reminderFormError.value = "测试前请先选择至少一个通知渠道。";
    return;
  }

  isTestingReminder.value = true;
  try {
    const payload: TestNotificationPayload = {
      channels: reminderForm.channels,
      config: createReminderPayload(reminderForm),
    };
    const result = await subscriptionService.testNotification(reminderTargetId.value, payload);
    reminderTestResult.value = result;
    const successCount = Object.values(result).filter(Boolean).length;
    if (successCount > 0) {
      notifier.success(`测试通知发送成功（${successCount}/${payload.channels.length}）`);
    } else {
      notifier.error("测试通知发送失败，请检查渠道配置。");
    }
  } catch (error) {
    reminderFormError.value = extractErrorMessage(error, "测试通知失败，请稍后重试。");
  } finally {
    isTestingReminder.value = false;
  }
}

async function handleToggleStatus(subscription: Subscription): Promise<void> {
  const nextStatus = subscription.status === "active" ? "paused" : "active";
  pendingStatusId.value = subscription.id;
  try {
    const updated = await subscriptionService.updateStatus(subscription.id, nextStatus);
    upsertSubscription(updated);
    notifier.success(nextStatus === "paused" ? "订阅已暂停" : "订阅已恢复");
  } catch (error) {
    notifier.error(extractErrorMessage(error, "更新状态失败，请稍后重试。"));
  } finally {
    pendingStatusId.value = null;
  }
}

async function handleDeleteSubscription(subscription: Subscription): Promise<void> {
  const shouldDelete = window.confirm(`确定要删除「${subscription.name}」吗？此操作不可撤销。`);
  if (!shouldDelete) return;

  deletePendingId.value = subscription.id;
  try {
    await subscriptionService.deleteSubscription(subscription.id);
    subscriptions.value = subscriptions.value.filter((item) => item.id !== subscription.id);
    if (selectedSubId.value === subscription.id) {
      selectedSubId.value = subscriptions.value.length > 0 ? subscriptions.value[0].id : null;
    }
    notifier.success("订阅已删除");
  } catch (error) {
    notifier.error(extractErrorMessage(error, "删除订阅失败，请稍后重试。"));
  } finally {
    deletePendingId.value = null;
  }
}

onMounted(() => {
  void fetchSubscriptions();
});
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
