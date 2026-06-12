import {
  wereadGateway,
  type BookRecommendItem,
  type ReadDetailSnapshot,
  type ReadStatsMode,
} from '@/api/wereadGateway';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const ALL_MODES: ReadStatsMode[] = ['weekly', 'monthly', 'annually', 'overall'];

/** snapshots key = `${mode}:${baseTime ?? 'current'}` */
function snapshotKey(mode: ReadStatsMode, baseTime?: number | null): string {
  return `${mode}:${baseTime ?? 'current'}`;
}

export const useReadStatsStore = defineStore('readStats', () => {
  const snapshots = ref<Record<string, ReadDetailSnapshot>>({});
  const isLoading = ref(false);
  const error = ref('');

  // ── 推荐 ────────────────────────────────────────────────────
  const recommends = ref<BookRecommendItem[]>([]);
  const isLoadingRecommends = ref(false);
  const recommendError = ref('');
  const recommendMaxIdx = ref(0);
  const hasMoreRecommends = ref(true);

  // ── 当前周期的 4 个快照（用于 BookStats 顶层 tabs） ──
  const currentByMode = computed(() => {
    const map: Record<string, ReadDetailSnapshot> = {};
    for (const mode of ALL_MODES) {
      const s = snapshots.value[snapshotKey(mode, null)];
      if (s) map[mode] = s;
    }
    return map;
  });

  /** 兼容旧用法：作为 array 暴露当前周期快照 */
  const snapshotByMode = currentByMode;
  const currentSnapshots = computed(() => Object.values(currentByMode.value));

  const weeklySnapshot = computed(
    () => currentByMode.value['weekly'] ?? null,
  );
  const monthlySnapshot = computed(
    () => currentByMode.value['monthly'] ?? null,
  );

  /**
   * 拉取指定 mode + 周期的快照。baseTime=null 代表当前周期。
   * 不传 mode 时退化为当前周期 4 mode 并发拉取（首屏行为）。
   */
  async function fetchStats(): Promise<void>;
  async function fetchStats(
    mode: ReadStatsMode,
    baseTime?: number | null,
  ): Promise<void>;
  async function fetchStats(
    mode?: ReadStatsMode,
    baseTime: number | null = null,
  ): Promise<void> {
    isLoading.value = true;
    error.value = '';
    try {
      if (!mode) {
        const results = await Promise.all(
          ALL_MODES.map((m) => wereadGateway.getReadProgress(m, null)),
        );
        const next: Record<string, ReadDetailSnapshot> = { ...snapshots.value };
        ALL_MODES.forEach((m, i) => {
          const r = results[i];
          if (r.status === 'success' && r.data) {
            next[snapshotKey(m, null)] = r.data;
          }
        });
        snapshots.value = next;
        return;
      }

      const res = await wereadGateway.getReadProgress(mode, baseTime);
      if (res.status === 'success' && res.data) {
        snapshots.value = {
          ...snapshots.value,
          [snapshotKey(mode, baseTime)]: res.data,
        };
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

  function getSnapshot(
    mode: ReadStatsMode,
    baseTime: number | null = null,
  ): ReadDetailSnapshot | null {
    return snapshots.value[snapshotKey(mode, baseTime)] ?? null;
  }

  /**
   * 拉取推荐书籍。
   * - reset=true（默认）→ 从头拉，覆盖现有列表
   * - reset=false → 从 recommendMaxIdx 续取，追加到列表末尾
   */
  async function fetchRecommends(
    reset = true,
    count = 12,
  ): Promise<void> {
    if (isLoadingRecommends.value) return;
    if (!reset && !hasMoreRecommends.value) return;
    isLoadingRecommends.value = true;
    recommendError.value = '';
    try {
      const maxIdx = reset ? 0 : recommendMaxIdx.value;
      const res = await wereadGateway.getBooksRecommend(count, maxIdx);
      if (res.status !== 'success' || !res.data) {
        throw new Error(res.message || '获取推荐失败');
      }
      const list = res.data;
      if (reset) {
        recommends.value = list;
      } else {
        // 去重 by bookId，避免远端分页重叠
        const seen = new Set(recommends.value.map((b) => b.bookId));
        recommends.value = [
          ...recommends.value,
          ...list.filter((b) => !seen.has(b.bookId)),
        ];
      }
      if (list.length === 0) {
        hasMoreRecommends.value = false;
      } else {
        const lastIdx = list[list.length - 1].searchIdx;
        recommendMaxIdx.value = lastIdx > 0 ? lastIdx : maxIdx + list.length;
        hasMoreRecommends.value = list.length >= count;
      }
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      recommendError.value =
        e?.response?.data?.message || e?.message || '获取推荐失败';
    } finally {
      isLoadingRecommends.value = false;
    }
  }

  // 读过/读完/笔记等统计
  const readStatItems = computed(() => weeklySnapshot.value?.readStat ?? []);

  const preferAuthors = computed(
    () => weeklySnapshot.value?.preferAuthor ?? [],
  );

  const preferPublishers = computed(
    () => weeklySnapshot.value?.preferPublisher ?? [],
  );

  const readListenRatio = computed(() => {
    const s = weeklySnapshot.value;
    if (!s) return { read: 0, listen: 0 };
    return {
      read: s.wrReadTime ?? 0,
      listen: s.wrListenTime ?? 0,
    };
  });

  return {
    snapshots: currentSnapshots, // 旧调用方期望的 array 视图
    isLoading,
    error,
    snapshotByMode,
    currentByMode,
    weeklySnapshot,
    monthlySnapshot,
    readStatItems,
    preferAuthors,
    preferPublishers,
    readListenRatio,
    fetchStats,
    getSnapshot,
    // 推荐
    recommends,
    isLoadingRecommends,
    recommendError,
    hasMoreRecommends,
    fetchRecommends,
  };
});
