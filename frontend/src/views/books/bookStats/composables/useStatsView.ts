import type { ReadDetailSnapshot, ReadStatsMode } from '@/api/wereadGateway';
import dayjs from 'dayjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import type { useEChartsTheme } from './useEChartsTheme';

type Snapshot = ReadDetailSnapshot | null;

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/**
 * 接收 active snapshot + active mode + theme colors，输出 BookStats 各
 * 段落的派生数据：文案、top 排序、占比、hasXxxData 哨兵、ECharts options。
 */
export function useStatsView(
  snapshot: ComputedRef<Snapshot> | Ref<Snapshot>,
  mode: ComputedRef<ReadStatsMode> | Ref<ReadStatsMode>,
  theme: ReturnType<typeof useEChartsTheme>,
) {
  // ── 段落一文案 ─────────────────────────────────────────────────
  const paragraphOneEyebrow = computed(() => {
    const m = mode.value;
    if (m === 'overall') return '从开始到现在,你一共读了';
    if (m === 'weekly') return '这一周,你读了';
    if (m === 'monthly') return '这个月,你读了';
    return '这一年,你读了';
  });

  const paragraphOneSubtitle = computed(() => {
    const s = snapshot.value;
    if (!s) return '';
    const days = s.readDays ?? 0;
    const avg = formatDuration(s.dayAverageReadTime ?? 0);
    if (mode.value === 'overall') {
      return `覆盖 ${days} 天 · 日均 ${avg}`;
    }
    const compare = formatCompareSentence(s.compare, mode.value);
    const head = `${days} 天有阅读 · 日均 ${avg}`;
    return compare ? `${head}${compare}` : head;
  });

  // ── 段落二（最长阅读）─────────────────────────────────────────
  const topReadLongest = computed(() => {
    const items = snapshot.value?.readLongest ?? [];
    return [...items].sort((a, b) => b.readTime - a.readTime).slice(0, 5);
  });

  const longestMaxTime = computed(() => topReadLongest.value[0]?.readTime ?? 1);

  function longestBarPercent(t: number): number {
    if (longestMaxTime.value <= 0) return 0;
    return Math.max(4, Math.round((t / longestMaxTime.value) * 100));
  }

  // ── 段落三（节奏）─────────────────────────────────────────────
  const hasTrendData = computed(() => {
    const t = snapshot.value?.readTimes;
    return !!t && Object.keys(t).length > 0;
  });

  const hasPreferTimeData = computed(() => {
    const t = snapshot.value?.preferTime;
    return !!t && t.some((v) => v > 0);
  });

  const hasReadListenData = computed(() => {
    const s = snapshot.value;
    return !!s && ((s.wrReadTime ?? 0) > 0 || (s.wrListenTime ?? 0) > 0);
  });

  const hasRhythmData = computed(
    () =>
      hasTrendData.value || hasPreferTimeData.value || hasReadListenData.value,
  );

  const trendSubtitle = computed(() => {
    const m = mode.value;
    if (m === 'weekly') return '每天的阅读时长';
    if (m === 'monthly') return '本月每天的阅读时长';
    if (m === 'annually') return '本年每月的阅读时长';
    return '阅读时长走势';
  });

  const peakTimeLabel = computed(() => {
    const times = snapshot.value?.preferTime;
    if (!times || !times.length) return null;
    let peak = -1;
    let peakIdx = 0;
    times.forEach((v, i) => {
      if (v > peak) {
        peak = v;
        peakIdx = i;
      }
    });
    if (peak <= 0) return null;
    return `${String(peakIdx).padStart(2, '0')}:00`;
  });

  const preferTimeSubtitle = computed(() => {
    const peak = peakTimeLabel.value;
    return peak ? `一天里最专注的时段是 ${peak}` : '一天中各时段的阅读频率';
  });

  const readPercent = computed(() => {
    const s = snapshot.value;
    if (!s) return 0;
    const r = s.wrReadTime ?? 0;
    const l = s.wrListenTime ?? 0;
    const total = r + l;
    if (total === 0) return 0;
    return Math.round((r / total) * 100);
  });
  const listenPercent = computed(() => 100 - readPercent.value);

  const readListenSubtitle = computed(() => {
    if (readPercent.value >= 80) return '你主要靠看的';
    if (listenPercent.value >= 80) return '你主要靠听的';
    return '文字阅读 与 听书 的占比';
  });

  // ── 段落四（偏好）────────────────────────────────────────────
  const topCategories = computed(() => {
    const cats = snapshot.value?.preferCategory ?? [];
    if (!cats.length) return [];
    const total = cats.reduce((sum, c) => sum + (c.readingTime ?? 0), 0) || 1;
    return cats
      .map((c) => ({ ...c, share: (c.readingTime ?? 0) / total }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 4);
  });

  const topAuthors = computed(() =>
    (snapshot.value?.preferAuthor ?? []).slice(0, 5),
  );

  const topPublishers = computed(() =>
    (snapshot.value?.preferPublisher ?? []).slice(0, 5),
  );

  const hasPreferenceData = computed(
    () =>
      topCategories.value.length > 0 ||
      topAuthors.value.length > 0 ||
      topPublishers.value.length > 0,
  );

  // ── 整页有无任何数据 ─────────────────────────────────────────
  const hasAnyData = computed(() => {
    const s = snapshot.value;
    if (!s) return false;
    return (
      (s.totalReadTime ?? 0) > 0 ||
      (s.readLongest && s.readLongest.length > 0) ||
      hasRhythmData.value ||
      hasPreferenceData.value
    );
  });

  // ── ECharts options（极简、无渐变填充）───────────────────────
  function formatTrendLabel(ts: string): string {
    const d = dayjs.unix(Number(ts));
    if (!d.isValid()) return ts;
    if (mode.value === 'annually') return d.format('M 月');
    return d.format('M/D');
  }

  const trendOption = computed(() => {
    const readTimes = snapshot.value?.readTimes;
    if (!readTimes) return {};
    const entries = Object.entries(readTimes).sort(
      ([a], [b]) => Number(a) - Number(b),
    );
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (p: { name: string; value: number }[]) =>
          `${p[0].name}<br/>${formatDuration(p[0].value)}`,
      },
      grid: { left: 36, right: 8, top: 8, bottom: 28 },
      xAxis: {
        type: 'category',
        data: entries.map(([k]) => formatTrendLabel(k)),
        axisLine: { lineStyle: { color: theme.axisColor.value } },
        axisTick: { show: false },
        axisLabel: { color: theme.subtextColor.value, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme.subtextColor.value,
          fontSize: 11,
          formatter: (v: number) => `${Math.round(v / 60)}m`,
        },
        splitLine: {
          lineStyle: { color: theme.splitLineColor.value, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          data: entries.map(([, v]) => v),
          barCategoryGap: '15%',
          itemStyle: {
            color: theme.primaryColor.value,
            borderRadius: [12, 12, 0, 0],
          },
          emphasis: {
            itemStyle: { color: theme.primaryColor.value },
          },
        },
      ],
    };
  });

  const preferTimeOption = computed(() => {
    const times = snapshot.value?.preferTime;
    if (!times) return {};
    const peak = Math.max(...times);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (p: { name: string; value: number }[]) =>
          `${p[0].name}<br/>${p[0].value} 次`,
      },
      grid: { left: 36, right: 8, top: 8, bottom: 28 },
      xAxis: {
        type: 'category',
        data: times.map((_, i) => `${String(i).padStart(2, '0')}:00`),
        axisLine: { lineStyle: { color: theme.axisColor.value } },
        axisTick: { show: false },
        axisLabel: {
          color: theme.subtextColor.value,
          fontSize: 11,
          interval: 3,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme.subtextColor.value, fontSize: 11 },
        splitLine: {
          lineStyle: { color: theme.splitLineColor.value, type: 'dashed' },
        },
      },
      series: [
        {
          type: 'bar',
          data: times.map((v) => ({
            value: v,
            itemStyle: {
              color:
                v === peak && peak > 0
                  ? theme.primaryColor.value
                  : theme.mutedFillColor.value,
            },
          })),
          barMaxWidth: 14,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  });

  return {
    // 段落一
    paragraphOneEyebrow,
    paragraphOneSubtitle,
    // 段落二
    topReadLongest,
    longestBarPercent,
    // 段落三
    hasTrendData,
    hasPreferTimeData,
    hasReadListenData,
    hasRhythmData,
    trendSubtitle,
    preferTimeSubtitle,
    readListenSubtitle,
    readPercent,
    listenPercent,
    trendOption,
    preferTimeOption,
    // 段落四
    topCategories,
    topAuthors,
    topPublishers,
    hasPreferenceData,
    // 整体
    hasAnyData,
    // 工具
    formatDuration,
  };
}

function formatCompareSentence(
  val: number | null | undefined,
  mode: ReadStatsMode,
): string {
  if (val == null) return '';
  const pct = Math.round(Math.abs(val) * 100);
  if (pct === 0) return '';
  const dir = val >= 0 ? '多' : '少';
  const ref = {
    weekly: '上周',
    monthly: '上月',
    annually: '去年',
    overall: '',
  }[mode];
  return ` · 比${ref}${dir} ${pct}%`;
}
