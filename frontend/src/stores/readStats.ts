import { wereadGateway, type ReadDetailSnapshot } from '@/api/wereadGateway';
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
      const res = await wereadGateway.getReadProgress(forceRefresh);
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

  // 读过/读完/笔记等统计
  const readStatItems = computed(() => weeklySnapshot.value?.readStat ?? []);

  // 偏好作者
  const preferAuthors = computed(
    () => weeklySnapshot.value?.preferAuthor ?? [],
  );

  // 偏好出版社
  const preferPublishers = computed(
    () => weeklySnapshot.value?.preferPublisher ?? [],
  );

  // 文字/听书时长
  const readListenRatio = computed(() => {
    const s = weeklySnapshot.value;
    if (!s) return { read: 0, listen: 0 };
    return {
      read: s.wrReadTime ?? 0,
      listen: s.wrListenTime ?? 0,
    };
  });

  return {
    snapshots,
    isLoading,
    error,
    snapshotByMode,
    weeklySnapshot,
    readStatItems,
    preferAuthors,
    preferPublishers,
    readListenRatio,
    fetchStats,
  };
});
