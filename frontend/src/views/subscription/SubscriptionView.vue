<script setup lang="ts">
import type {
  Subscription,
  TestNotificationPayload,
} from '@/api/subscriptionGateway';
import BasicDetail from '@/components/basic/BasicDetail.vue';
import { subscriptionGateway } from '@/api/subscriptionGateway';
import { useNotificationStore } from '@/stores/notification';
import { formatDate } from '@/utils/formatdate';
import ReminderConfigModal from '@/views/subscription/components/ReminderConfigModal.vue';
import SubscriptionCardList from '@/views/subscription/components/SubscriptionCardList.vue';
import SubscriptionDetailPanel from '@/views/subscription/components/SubscriptionDetailPanel.vue';
import SubscriptionFormModal from '@/views/subscription/components/SubscriptionFormModal.vue';
import SubscriptionStatsPanel from '@/views/subscription/components/SubscriptionStatsPanel.vue';
import {
  applyFormValues,
  applyReminderFormValues,
  createDefaultReminderForm,
  createDefaultSubscriptionForm,
  createReminderFormState,
  createReminderPayload,
  currencySuggestions,
  formatPrice,
  getCycleLabel,
  getDaysUntil,
  getMonthlyEstimate,
  getReminderChannelsText,
  getReminderPointsText,
  getStatusMeta,
  hasEnabledReminderPoint,
  mapSubscriptionToForm,
  toCreatePayload,
  toDateInputValue,
  toUpdatePayload,
  upsertSubscription,
  validateSubscriptionForm,
} from '@/views/subscription/subscriptionUtils';
import type {
  ReminderFormState,
  SubscriptionFormState,
} from '@/views/subscription/types';
import type { AxiosError } from 'axios';
import { computed, onMounted, reactive, ref } from 'vue';

const notifier = useNotificationStore();

const subscriptions = ref<Subscription[]>([]);
const isLoading = ref<boolean>(false);
const isRefreshing = ref<boolean>(false);
const errorMessage = ref<string>('');
const selectedSubId = ref<number | null>(null);

const isAddModalOpen = ref<boolean>(false);
const isEditModalOpen = ref<boolean>(false);
const isReminderModalOpen = ref<boolean>(false);

const createForm = reactive<SubscriptionFormState>(
  createDefaultSubscriptionForm(),
);
const editForm = reactive<SubscriptionFormState>(
  createDefaultSubscriptionForm(),
);
const reminderForm = reactive<ReminderFormState>(createDefaultReminderForm());

const editTargetId = ref<number | null>(null);
const reminderTargetId = ref<number | null>(null);

const addFormError = ref<string>('');
const editFormError = ref<string>('');
const reminderFormError = ref<string>('');

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
  return (
    subscriptions.value.find((item) => item.id === selectedSubId.value) ?? null
  );
});

const activeCount = computed<number>(
  () => subscriptions.value.filter((item) => item.status === 'active').length,
);

const monthlyEstimate = computed<number>(() =>
  subscriptions.value
    .filter((item) => item.status === 'active')
    .reduce((total, item) => total + getMonthlyEstimate(item), 0),
);

const dueSoonCount = computed<number>(
  () =>
    subscriptions.value.filter(
      (item) =>
        item.status === 'active' && getDaysUntil(item.next_billing_date) <= 7,
    ).length,
);

function extractErrorMessage(error: unknown, fallbackMessage: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    (error instanceof Error ? error.message : fallbackMessage)
  );
}

async function fetchSubscriptions(): Promise<void> {
  errorMessage.value = '';
  const showSkeleton = subscriptions.value.length === 0;
  if (showSkeleton) {
    isLoading.value = true;
  } else {
    isRefreshing.value = true;
  }

  try {
    const data = await subscriptionGateway.getSubscriptions();
    subscriptions.value = data;
    if (data.length === 0) {
      selectedSubId.value = null;
      return;
    }
    const selectedStillExists =
      selectedSubId.value !== null &&
      data.some((item) => item.id === selectedSubId.value);
    if (!selectedStillExists) {
      selectedSubId.value = data[0].id;
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      '加载订阅列表失败，请稍后重试。',
    );
    errorMessage.value = message;
    notifier.error(message);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

function openAddModal(): void {
  addFormError.value = '';
  applyFormValues(createForm, createDefaultSubscriptionForm());
  isAddModalOpen.value = true;
}

async function handleCreateSubscription(
  form: SubscriptionFormState,
): Promise<void> {
  addFormError.value = '';
  const validationError = validateSubscriptionForm(form);
  if (validationError) {
    addFormError.value = validationError;
    return;
  }

  isCreating.value = true;
  try {
    const created = await subscriptionGateway.createSubscription(
      toCreatePayload(form),
    );
    subscriptions.value = [created, ...subscriptions.value];
    selectedSubId.value = created.id;
    isAddModalOpen.value = false;
    notifier.success('订阅创建成功');
  } catch (error) {
    addFormError.value = extractErrorMessage(
      error,
      '创建订阅失败，请稍后重试。',
    );
  } finally {
    isCreating.value = false;
  }
}

function openEditModal(subscription: Subscription): void {
  editTargetId.value = subscription.id;
  editFormError.value = '';
  applyFormValues(editForm, mapSubscriptionToForm(subscription));
  isEditModalOpen.value = true;
}

async function handleUpdateSubscription(
  form: SubscriptionFormState,
): Promise<void> {
  if (editTargetId.value === null) return;

  editFormError.value = '';
  const validationError = validateSubscriptionForm(form);
  if (validationError) {
    editFormError.value = validationError;
    return;
  }

  isUpdating.value = true;
  try {
    const updated = await subscriptionGateway.updateSubscription(
      editTargetId.value,
      toUpdatePayload(form),
    );
    subscriptions.value = upsertSubscription(subscriptions.value, updated);
    isEditModalOpen.value = false;
    notifier.success('订阅信息已更新');
  } catch (error) {
    editFormError.value = extractErrorMessage(
      error,
      '更新订阅失败，请稍后重试。',
    );
  } finally {
    isUpdating.value = false;
  }
}

function openReminderModal(subscription: Subscription): void {
  reminderTargetId.value = subscription.id;
  reminderFormError.value = '';
  reminderTestResult.value = null;
  applyReminderFormValues(
    reminderForm,
    createReminderFormState(subscription.reminder_config),
  );
  isReminderModalOpen.value = true;
}

function syncReminderForm(source: ReminderFormState): void {
  applyReminderFormValues(reminderForm, source);
}

async function handleSaveReminderConfig(): Promise<void> {
  if (reminderTargetId.value === null) return;

  reminderFormError.value = '';
  if (reminderForm.channels.length === 0) {
    reminderFormError.value = '请至少选择一个通知渠道。';
    return;
  }
  if (!hasEnabledReminderPoint(reminderForm)) {
    reminderFormError.value = '请至少选择一个提醒时间点。';
    return;
  }

  isSavingReminder.value = true;
  try {
    const updated = await subscriptionGateway.updateReminders(
      reminderTargetId.value,
      createReminderPayload(reminderForm),
    );
    subscriptions.value = upsertSubscription(subscriptions.value, updated);
    isReminderModalOpen.value = false;
    notifier.success('通知配置已保存');
  } catch (error) {
    reminderFormError.value = extractErrorMessage(
      error,
      '保存通知配置失败，请稍后重试。',
    );
  } finally {
    isSavingReminder.value = false;
  }
}

async function handleSaveReminderConfigFromForm(
  form: ReminderFormState,
): Promise<void> {
  syncReminderForm(form);
  await handleSaveReminderConfig();
}

async function handleTestNotification(): Promise<void> {
  if (reminderTargetId.value === null) return;

  reminderFormError.value = '';
  reminderTestResult.value = null;
  if (reminderForm.channels.length === 0) {
    reminderFormError.value = '测试前请先选择至少一个通知渠道。';
    return;
  }

  isTestingReminder.value = true;
  try {
    const payload: TestNotificationPayload = {
      channels: reminderForm.channels,
      config: createReminderPayload(reminderForm),
    };
    const result = await subscriptionGateway.testNotification(
      reminderTargetId.value,
      payload,
    );
    reminderTestResult.value = result;
    const successCount = Object.values(result).filter(Boolean).length;
    if (successCount > 0) {
      notifier.success(
        `测试通知发送成功（${successCount}/${payload.channels.length}）`,
      );
    } else {
      notifier.error('测试通知发送失败，请检查渠道配置。');
    }
  } catch (error) {
    reminderFormError.value = extractErrorMessage(
      error,
      '测试通知失败，请稍后重试。',
    );
  } finally {
    isTestingReminder.value = false;
  }
}

async function handleTestNotificationFromForm(
  form: ReminderFormState,
): Promise<void> {
  syncReminderForm(form);
  await handleTestNotification();
}

async function handleToggleStatus(subscription: Subscription): Promise<void> {
  const nextStatus = subscription.status === 'active' ? 'paused' : 'active';
  pendingStatusId.value = subscription.id;
  try {
    const updated = await subscriptionGateway.updateStatus(
      subscription.id,
      nextStatus,
    );
    subscriptions.value = upsertSubscription(subscriptions.value, updated);
    notifier.success(nextStatus === 'paused' ? '订阅已暂停' : '订阅已恢复');
  } catch (error) {
    notifier.error(extractErrorMessage(error, '更新状态失败，请稍后重试。'));
  } finally {
    pendingStatusId.value = null;
  }
}

async function handleDeleteSubscription(
  subscription: Subscription,
): Promise<void> {
  const shouldDelete = window.confirm(
    `确定要删除「${subscription.name}」吗？此操作不可撤销。`,
  );
  if (!shouldDelete) return;

  deletePendingId.value = subscription.id;
  try {
    await subscriptionGateway.deleteSubscription(subscription.id);
    subscriptions.value = subscriptions.value.filter(
      (item) => item.id !== subscription.id,
    );
    if (selectedSubId.value === subscription.id) {
      selectedSubId.value =
        subscriptions.value.length > 0 ? subscriptions.value[0].id : null;
    }
    notifier.success('订阅已删除');
  } catch (error) {
    notifier.error(extractErrorMessage(error, '删除订阅失败，请稍后重试。'));
  } finally {
    deletePendingId.value = null;
  }
}

onMounted(() => {
  void fetchSubscriptions();
});
</script>

<template>
  <BasicDetail
    title="SubTracker | 订阅管理"
    subtitle="桌面端统一管理订阅信息、账单周期与通知配置"
  >
    <div class="col-span-full mx-auto w-full max-w-6xl space-y-8">
      <SubscriptionStatsPanel
        :total-count="subscriptions.length"
        :active-count="activeCount"
        :monthly-estimate="monthlyEstimate"
        :due-soon-count="dueSoonCount"
        :is-loading="isLoading"
        :is-refreshing="isRefreshing"
        @refresh="fetchSubscriptions"
        @add="openAddModal"
      />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <SubscriptionCardList
          :subscriptions="sortedSubscriptions"
          :selected-sub-id="selectedSubId"
          :is-loading="isLoading"
          :error-message="errorMessage"
          :pending-status-id="pendingStatusId"
          :delete-pending-id="deletePendingId"
          :to-date-input-value="toDateInputValue"
          :get-days-until="getDaysUntil"
          :get-cycle-label="getCycleLabel"
          :format-price="formatPrice"
          :get-status-meta="getStatusMeta"
          :get-reminder-channels-text="getReminderChannelsText"
          :get-reminder-points-text="getReminderPointsText"
          @select="selectedSubId = $event"
          @retry="fetchSubscriptions"
          @edit="openEditModal"
          @reminder="openReminderModal"
          @toggle-status="handleToggleStatus"
          @delete="handleDeleteSubscription"
        />

        <SubscriptionDetailPanel
          :selected-subscription="selectedSubscription"
          :pending-status-id="pendingStatusId"
          :delete-pending-id="deletePendingId"
          :to-date-input-value="toDateInputValue"
          :get-cycle-label="getCycleLabel"
          :format-price="formatPrice"
          :format-date="formatDate"
          :get-status-meta="getStatusMeta"
          :get-reminder-channels-text="getReminderChannelsText"
          :get-reminder-points-text="getReminderPointsText"
          @edit="openEditModal"
          @reminder="openReminderModal"
          @toggle-status="handleToggleStatus"
          @delete="handleDeleteSubscription"
        />
      </div>
    </div>

    <Teleport to="body">
      <SubscriptionFormModal
        mode="create"
        :is-open="isAddModalOpen"
        title="新增订阅"
        description="创建新的订阅记录，默认状态为进行中。"
        submit-text="确认创建"
        loading-text="创建中..."
        :is-submitting="isCreating"
        :form="createForm"
        :error-message="addFormError"
        :currency-suggestions="currencySuggestions"
        @close="isAddModalOpen = false"
        @submit="handleCreateSubscription"
      />
    </Teleport>

    <Teleport to="body">
      <SubscriptionFormModal
        mode="edit"
        :is-open="isEditModalOpen"
        title="编辑订阅"
        description="更新订阅信息、状态和账单日期。"
        submit-text="保存更改"
        loading-text="保存中..."
        :is-submitting="isUpdating"
        :form="editForm"
        :error-message="editFormError"
        :currency-suggestions="currencySuggestions"
        :include-status="true"
        @close="isEditModalOpen = false"
        @submit="handleUpdateSubscription"
      />
    </Teleport>

    <Teleport to="body">
      <ReminderConfigModal
        :is-open="isReminderModalOpen"
        :form="reminderForm"
        :is-testing="isTestingReminder"
        :is-saving="isSavingReminder"
        :error-message="reminderFormError"
        :test-result="reminderTestResult"
        @close="isReminderModalOpen = false"
        @test="handleTestNotificationFromForm"
        @save="handleSaveReminderConfigFromForm"
      />
    </Teleport>
  </BasicDetail>
</template>
