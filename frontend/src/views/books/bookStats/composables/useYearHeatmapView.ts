import type { ReadDetailSnapshot, ReadStatsMode } from '@/api/wereadGateway';
import { formatDuration } from '@/utils/format/duration';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';
import type { useEChartsTheme } from './useEChartsTheme';

dayjs.extend(isoWeek);

type Snapshot = ReadDetailSnapshot | null;

/**
 * 段落三·年视图日历热力图——GitHub 风格 53 周 × 7 天 grid。
 *
 * 数据源:readTimes(annually mode 下 WeRead /readdata/detail 返回 12 个月桶,
 * key 是月初 unix 秒,value 是当月总秒数)。每日 cell 用「当月总量 / 当月天数」
 * 均匀分摊(明确标注为估算,后续可换日级数据源提升精度)。
 *
 * 不用 ECharts calendar 组件——calendar+heatmap 的 visualMap 默认
 * dimension=0 会把日期字符串误当数值。改用普通 heatmap + 三元组 data
 * [weekIdx, dayOfWeek(0=Mon..6=Sun), value],visualMap 直接吃第三维。
 *
 * hasData 哨兵(仅 annually 有数据)+ 1 个 ECharts heatmap option + 1 段文案。
 */
export function useYearHeatmapView(
  snapshot: ComputedRef<Snapshot> | Ref<Snapshot>,
  mode: ComputedRef<ReadStatsMode> | Ref<ReadStatsMode>,
  theme: ReturnType<typeof useEChartsTheme>,
) {
  // ── 哨兵 ─────────────────────────────────────────────────────
  const hasData = computed(() => {
    if (mode.value !== 'annually') return false;
    const t = snapshot.value?.readTimes;
    return !!t && Object.keys(t).length > 0;
  });

  // ── 段落文案 ─────────────────────────────────────────────────
  const subtitle = computed(() => '本年每日的阅读时长(按月总量估算)');

  // ── ECharts heatmap option (53 周 × 7 天 grid) ──────────────
  const heatmapOption = computed(() => {
    const readTimes = snapshot.value?.readTimes;
    if (!readTimes) return {};
    const entries = Object.entries(readTimes).sort(
      ([a], [b]) => Number(a) - Number(b),
    );
    if (!entries.length) return {};

    const year = dayjs.unix(Number(entries[0][0])).year();
    const firstDay = dayjs(`${year}-01-01`);
    const lastDay = dayjs(`${year}-12-31`);

    // 每月总量平摊到该月每天 → Map<dateStr, seconds>
    const dayValue: Record<string, number> = {};
    let maxVal = 0;
    entries.forEach(([ts, secs]) => {
      const d = dayjs.unix(Number(ts));
      if (!d.isValid()) return;
      const daysInMonth = d.daysInMonth();
      const perDay = Math.round(secs / daysInMonth);
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = d.date(day).format('YYYY-MM-DD');
        dayValue[dateStr] = perDay;
        if (perDay > maxVal) maxVal = perDay;
      }
    });

    // 遍历全年每一天 → [weekIdx, dayOfWeek(0=Mon..6=Sun), seconds]
    const firstIsoWeek = firstDay.isoWeek();
    const data: [number, number, number][] = [];
    // 记录每月首次出现的 weekIdx,在 xAxis 上画月份标签
    const monthLabels: { weekIdx: number; month: number }[] = [];
    const seenMonths = new Set<number>();
    let cursor = firstDay.clone();
    while (cursor.isBefore(lastDay) || cursor.isSame(lastDay, 'day')) {
      const dateStr = cursor.format('YYYY-MM-DD');
      const val = dayValue[dateStr] ?? 0;
      // 0=Mon..6=Sun (与中文 一-日 对应)
      const dow = cursor.day() === 0 ? 6 : cursor.day() - 1;
      const wDiff = cursor.isoWeek() - firstIsoWeek;
      const weekIdx = wDiff < 0 ? 0 : wDiff;
      data.push([weekIdx, dow, val]);
      const m = cursor.month() + 1;
      if (!seenMonths.has(m) && cursor.date() <= 7) {
        seenMonths.add(m);
        monthLabels.push({ weekIdx, month: m });
      }
      cursor = cursor.add(1, 'day');
    }

    const maxWeekIdx = data.reduce((m, d) => Math.max(m, d[0]), 0);

    return {
      tooltip: {
        formatter: (p: { value: [number, number, number] }) => {
          const [w, d, v] = p.value;
          const weekStart = firstDay.clone().startOf('isoWeek').add(w, 'week');
          const date = weekStart.add(d, 'day');
          return `${date.format('YYYY-MM-DD')}<br/>${formatDuration(v)}`;
        },
      },
      grid: { left: 24, right: 8, top: 18, bottom: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: Array.from({ length: maxWeekIdx + 1 }, (_, i) => i),
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          color: theme.subtextColor.value,
          fontSize: 10,
          interval: 0,
          formatter: (val: string) => {
            const found = monthLabels.find((m) => m.weekIdx === Number(val));
            return found ? `${found.month}月` : '';
          },
        },
      },
      yAxis: {
        type: 'category',
        data: ['一', '', '三', '', '五', '', '日'],
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: theme.subtextColor.value, fontSize: 10 },
        inverse: true, // 一 在顶部
      },
      visualMap: {
        min: 0,
        max: Math.max(maxVal, 60),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
        text: ['多', '少'],
        textStyle: { color: theme.subtextColor.value, fontSize: 11 },
        inRange: {
          color: [theme.mutedFillColor.value, theme.primaryColor.value],
        },
      },
      series: [
        {
          type: 'heatmap',
          data,
          itemStyle: { borderRadius: 2, borderColor: 'transparent' },
          emphasis: {
            itemStyle: {
              borderColor: theme.primaryColor.value,
              borderWidth: 1,
            },
          },
          progressive: 1000,
        },
      ],
    };
  });

  return {
    hasData,
    subtitle,
    heatmapOption,
  };
}
