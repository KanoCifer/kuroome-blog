import type { ReadDetailSnapshot } from '@/api/wereadGateway';
import { wereadService } from '@/services/wereadService';
import { create } from 'zustand';

interface ReadStatsState {
  snapshots: ReadDetailSnapshot[];
  isLoading: boolean;
  error: string;
  fetchStats: (forceRefresh?: boolean) => Promise<void>;
}

export const useReadStatsStore = create<ReadStatsState>((set) => ({
  snapshots: [],
  isLoading: false,
  error: '',

  fetchStats: async (forceRefresh = false) => {
    set({ isLoading: true, error: '' });
    try {
      const res = await wereadService.getReadProgress(forceRefresh);
      if (res.status === 'success' && res.data) {
        set({ snapshots: res.data.snapshots });
      } else {
        throw new Error(res.message || '获取阅读统计失败');
      }
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      set({
        error:
          e?.response?.data?.message || e?.message || '获取阅读统计失败',
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Selectors
export const selectSnapshotByMode = (state: ReadStatsState) => {
  const map: Record<string, ReadDetailSnapshot> = {};
  for (const s of state.snapshots) {
    map[s.mode] = s;
  }
  return map;
};

export const selectWeeklySnapshot = (state: ReadStatsState) => {
  const byMode = selectSnapshotByMode(state);
  return byMode['weekly'] ?? null;
};

export const selectReadStatItems = (state: ReadStatsState) => {
  const weekly = selectWeeklySnapshot(state);
  return weekly?.readStat ?? [];
};

export const selectPreferAuthors = (state: ReadStatsState) => {
  const weekly = selectWeeklySnapshot(state);
  return weekly?.preferAuthor ?? [];
};

export const selectPreferPublishers = (state: ReadStatsState) => {
  const weekly = selectWeeklySnapshot(state);
  return weekly?.preferPublisher ?? [];
};

export const selectReadListenRatio = (state: ReadStatsState) => {
  const weekly = selectWeeklySnapshot(state);
  if (!weekly) return { read: 0, listen: 0 };
  return {
    read: weekly.wrReadTime ?? 0,
    listen: weekly.wrListenTime ?? 0,
  };
};
