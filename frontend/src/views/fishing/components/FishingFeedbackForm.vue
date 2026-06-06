<script setup lang="ts">
import { fishingGateway } from '@/api/fishingGateway';
import { useNotificationStore } from '@/stores/notification';
import type {
  FishingFeedbackData,
  FishingFeedbackLevel,
  FishingFeedbackPayload,
} from '@/views/fishing/types';
import dayjs from 'dayjs';
import { ref } from 'vue';

interface Props {
  isOpen: boolean;
  fishingData: FishingFeedbackData;
  locationId: string;
  locationName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const FEEDBACK_OPTIONS: { value: FishingFeedbackLevel; label: string }[] = [
  { value: '爆护', label: '爆护' },
  { value: '好', label: '好' },
  { value: '一般', label: '一般' },
  { value: '差', label: '差' },
  { value: '空军', label: '空军' },
];

const notifier = useNotificationStore();
const loading = ref(false);
const selectedFeedback = ref<FishingFeedbackLevel | null>(null);

const handleSubmit = async () => {
  if (!selectedFeedback.value) {
    notifier.error('请选择钓鱼体验');
    return;
  }

  loading.value = true;

  try {
    const payload: FishingFeedbackPayload = {
      location_id: props.locationId,
      location_name: props.locationName,
      fishing_time: dayjs().toISOString(),
      feedback: selectedFeedback.value,
      temperature: props.fishingData.temperature,
      humidity: props.fishingData.humidity,
      pressure: props.fishingData.pressure,
      wind_speed: props.fishingData.wind_speed,
      precipitation: props.fishingData.precipitation,
      indices: props.fishingData.indices,
      tide_level: props.fishingData.tide_level,
      tide_type: props.fishingData.tide_type,
      tide_range: props.fishingData.tide_range,
      hours_to_next_tide: props.fishingData.hours_to_next_tide,
    };
    await fishingGateway.postFishingFeedback(payload);

    notifier.success('反馈已提交，感谢您的分享！');
    selectedFeedback.value = null;
    emit('success');
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交反馈失败，请重试';
    notifier.error(message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div class="bg-card mx-4 w-full max-w-md rounded-2xl p-6 shadow-xl">
          <h3 class="text-foreground mb-4 text-lg font-semibold">
            钓鱼反馈
            <span class="text-muted-foreground ml-2 text-sm font-normal"
              >你的反馈会帮助我们改进</span
            >
          </h3>

          <div class="bg-muted mb-4 rounded-lg p-3 text-sm">
            <p class="text-muted-foreground">地点: {{ locationName }}</p>
            <p class="text-muted-foreground">
              当前指数: {{ fishingData.fishing_index }} ({{
                fishingData.level
              }})
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium"
                >您的钓鱼体验</label
              >
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="option in FEEDBACK_OPTIONS"
                  :key="option.value"
                  type="button"
                  class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  :class="
                    selectedFeedback === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-accent'
                  "
                  @click="selectedFeedback = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="border-border text-foreground hover:bg-accent flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                :disabled="loading"
                @click="$emit('cancel')"
              >
                取消
              </button>
              <button
                type="button"
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!selectedFeedback || loading"
                @click="handleSubmit"
              >
                {{ loading ? '提交中...' : '确认提交' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
