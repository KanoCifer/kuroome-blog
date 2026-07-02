<template>
  <div
    class="border-border/60 bg-background h-full rounded-3xl border p-6 shadow-sm"
  >
    <h2 class="text-foreground mb-2 flex items-center gap-2 text-lg font-bold">
      <icon-analytics class="size-6" /> Browser Distribution
    </h2>
    <p class="text-muted-foreground mb-4 text-xs">Share of visits by browser</p>
    <div
      v-if="loading && !hasBrowserData"
      class="bg-muted h-64 animate-pulse rounded-xl"
    ></div>
    <!-- Empty state -->
    <div
      v-else-if="!hasBrowserData"
      class="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <div
        class="bg-muted text-muted-foreground/50 flex h-12 w-12 items-center justify-center rounded-full"
      >
        <icon-analytics class="size-6" />
      </div>
      <p class="text-foreground text-sm font-medium">No browser data yet</p>
      <p class="text-muted-foreground max-w-xs text-xs">
        Browser distribution will appear here once visitors reach your site.
      </p>
    </div>
    <div v-else class="h-64 w-full overflow-hidden">
      <v-chart :option="browserChartOption" autoresize class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconAnalytics from '@/components/icons/IconAnalytics.vue';
import { useChartColors, withAlpha } from '@/composables/shared';
import { computed } from 'vue';
import VChart from 'vue-echarts';

const MAX_BROWSERS = 5;

interface BrowserStat {
  browser_name: string;
  browser_version: string;
  count: number;
}

interface BrowserRow extends BrowserStat {
  displayName: string;
  pct: number;
}

interface Props {
  loading: boolean;
  browserStats: BrowserStat[] | null;
}

const props = defineProps<Props>();

const { palette } = useChartColors();

const hasBrowserData = computed(() => (props.browserStats ?? []).length > 0);

const total = computed(() =>
  (props.browserStats ?? []).reduce((s, it) => s + it.count, 0),
);

/** Descending list capped at MAX_BROWSERS, tail folded into "Other". */
const chartRows = computed<BrowserRow[]>(() => {
  const raw = [...(props.browserStats ?? [])].sort((a, b) => b.count - a.count);
  const t = total.value || 1;
  const head = raw.slice(0, MAX_BROWSERS - 1).map((r) => ({
    ...r,
    displayName: r.browser_name
      ? `${r.browser_name} ${r.browser_version || ''}`.trim()
      : 'Unknown',
    pct: (r.count / t) * 100,
  }));
  if (raw.length <= MAX_BROWSERS) return head;
  const othersCount = raw
    .slice(MAX_BROWSERS - 1)
    .reduce((s, it) => s + it.count, 0);
  return [
    ...head,
    {
      browser_name: 'Other',
      browser_version: '',
      count: othersCount,
      displayName: 'Other',
      pct: (othersCount / t) * 100,
    },
  ];
});

const browserChartOption = computed(() => {
  const p = palette.value;
  const rows = chartRows.value;
  const display = [...rows].reverse();

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      textStyle: { color: p.foreground },
      formatter: (params: unknown) => {
        const arr = params as Array<{ name: string; value: number }>;
        const it = arr[0];
        if (!it) return '';
        const row = display.find((r) => r.displayName === it.name);
        const pct = row ? row.pct.toFixed(1) : '0';
        return `<div style="font-weight:600;color:${p.foreground};">${it.name}</div><div style="color:${p.mutedForeground};margin-top:2px;">${it.value.toLocaleString()} (${pct}%)</div>`;
      },
    },
    grid: {
      left: 0,
      right: 56,
      bottom: 0,
      top: 0,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      show: false,
      max: Math.max(...rows.map((r) => r.count), 1) * 1.2,
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: display.map((r) => r.displayName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: p.foreground,
        fontSize: 11,
        fontWeight: 500,
        width: 120,
        overflow: 'truncate',
      },
    },
    series: [
      {
        name: 'Browser',
        type: 'bar',
        data: display.map((r, i) => ({
          value: r.count,
          itemStyle: {
            color: p.series[i % p.series.length],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right',
          color: p.mutedForeground,
          fontSize: 10,
          fontWeight: 600,
          distance: 8,
          formatter: (params: { dataIndex: number }) => {
            const row = display[params.dataIndex];
            if (!row) return '';
            return `${row.pct.toFixed(1)}%`;
          },
        },
      },
    ],
  };
});
</script>

<style scoped></style>
