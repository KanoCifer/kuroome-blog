import type { ReadDetailSnapshot } from '@/api/wereadGateway';
import { wereadService } from '@/service/wereadService';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useReadStatsStore = defineStore('readStats', () => {
  const snapshots = ref<ReadDetailSnapshot[]>([]);
  const isLoading = ref(false);
  const error = ref('');

  const snapshotByMode = computed(() => {
    const map: Record<string, ReadDetailSnapshot> = {};
    for (const s of snapshots.value) {
      map[s.mode] = s;
    }
    return map;
  });

  const weeklySnapshot = computed(
    () => snapshotByMode.value['weekly'] ?? null,
  );

  async function fetchStats(forceRefresh = false) {
    isLoading.value = true;
    error.value = '';
    try {
      const res = await wereadService.getReadProgress(forceRefresh);
      if (res.status === 'success' && res.data) {
        snapshots.value = res.data.snapshots;
      } else {
        throw new Error(res.message || '获取阅读统计失败');
      }
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      error.value =
        e?.response?.data?.message || e?.message || '获取阅读统计失败';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    snapshots,
    isLoading,
    error,
    snapshotByMode,
    weeklySnapshot,
    fetchStats,
  };
});
