<script setup lang="ts">
import { useChartColors, withAlpha } from '@/composables/useChartColors';
import { HARBOR_OPTIONS, useFishingMapStore } from '@/stores/fishingMap';
import FishingCard from '@/views/fishing/components/FishingCard.vue';
import dayjs from 'dayjs';
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import VChart from 'vue-echarts';

const fishingMapStore = useFishingMapStore();
const {
  panelTideData,
  tideLoading,
  selectedHarbor: selectedHarborState,
  selectedDate: selectedDateState,
  panelTideSpotName,
} = storeToRefs(fishingMapStore);

const tideData = computed(() => panelTideData.value);
const loading = computed(() => tideLoading.value);
const tideSpotName = computed(() => panelTideSpotName.value);
const { palette } = useChartColors();

const selectedHarbor = computed({
  get: () => selectedHarborState.value,
  set: (value: string) => fishingMapStore.setSelectedHarbor(value),
});
const selectedDate = computed({
  get: () => selectedDateState.value,
  set: (value: string) => fishingMapStore.setSelectedDate(value),
});

const dateOptions = computed(() =>
  Array(8)
    .fill(null)
    .map((_, i) => {
      const d = dayjs().add(i, 'day');
      return {
        value: d.format('YYYYMMDD'),
        label: d.format('MM-DD'),
        weekday: d.format('dd'),
      };
    }),
);

const todayStr = computed(() => {
  const opt = dateOptions.value.find((o) => o.value === selectedDate.value);
  return opt ? `${opt.label} ${opt.weekday}` : dayjs().format('YYYY-MM-DD');
});

const highTide = computed(() => {
  if (!tideData.value) return null;
  const highs = tideData.value.tideTable.filter((t) => t.type === 'H');
  if (highs.length === 0) return null;
  const maxEntry = highs.reduce((acc, h) =>
    Number(h.height) > Number(acc.height) ? h : acc,
  );
  return {
    height: Number(maxEntry.height),
    time: dayjs(maxEntry.fxTime).format('HH:mm'),
    fxTime: maxEntry.fxTime,
  };
});

const lowTide = computed(() => {
  if (!tideData.value) return null;
  const lows = tideData.value.tideTable.filter((t) => t.type === 'L');
  if (lows.length === 0) return null;
  const minEntry = lows.reduce((acc, l) =>
    Number(l.height) < Number(acc.height) ? l : acc,
  );
  return {
    height: Number(minEntry.height),
    time: dayjs(minEntry.fxTime).format('HH:mm'),
    fxTime: minEntry.fxTime,
  };
});

/** 把 fxTime ISO 字符串映射到 tideHourly 数组中最近的 index,供 markPoint 用 */
function findHourlyIndex(targetFxTime: string | undefined): number {
  if (!tideData.value || !targetFxTime) return -1;
  const target = dayjs(targetFxTime).valueOf();
  let bestIdx = -1;
  let bestDelta = Infinity;
  tideData.value.tideHourly.forEach((pt, idx) => {
    const delta = Math.abs(dayjs(pt.fxTime).valueOf() - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

const tideOptions = computed(() => {
  if (!tideData.value) return {};
  const p = palette.value;

  const hourly = tideData.value.tideHourly;
  const now = dayjs();
  let currentTimeIndex = -1;
  hourly.forEach((point, index) => {
    const pointTime = dayjs(point.fxTime);
    if (pointTime.isBefore(now) || pointTime.isSame(now)) {
      currentTimeIndex = index;
    }
  });

  // markPoint data 数组:把当日的高潮 / 低潮标到曲线上
  const markPointData: Array<{
    name: string;
    value: string;
    coord: [number, number];
    itemStyle: { color: string };
  }> = [];
  if (highTide.value) {
    const idx = findHourlyIndex(highTide.value.fxTime);
    if (idx >= 0) {
      markPointData.push({
        name: `高潮 ${highTide.value.time}`,
        value: `${highTide.value.height.toFixed(2)}m`,
        coord: [idx, highTide.value.height],
        itemStyle: { color: p.warning },
      });
    }
  }
  if (lowTide.value) {
    const idx = findHourlyIndex(lowTide.value.fxTime);
    if (idx >= 0) {
      markPointData.push({
        name: `低潮 ${lowTide.value.time}`,
        value: `${lowTide.value.height.toFixed(2)}m`,
        coord: [idx, lowTide.value.height],
        itemStyle: { color: p.primary },
      });
    }
  }

  return {
    backgroundColor: 'transparent',
    // 关键:禁用 animation 避免 setOption 时 echarts interpolate1DArray 崩
    // (3-stop 渐变 + markPoint pin coord 都参与动画时容易出问题)
    animation: false,
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: [10, 14],
      textStyle: { color: p.foreground, fontSize: 12 },
      formatter: (params: unknown) => {
        const arr = params as Array<{ axisValue: string; data: number }>;
        const param = arr[0];
        if (!param) return '';
        const timeStr = dayjs(param.axisValue).format('HH:mm');
        return `<div style="padding:2px 0;">
          <div style="font-weight:600;margin-bottom:4px;font-size:11px;color:${p.mutedForeground};">${timeStr}</div>
          <div>潮高 <span style="color:${p.primary};font-weight:700;margin-left:8px;">${param.data.toFixed(2)} m</span></div>
        </div>`;
      },
    },
    grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: hourly.map((point) => point.fxTime),
      axisLabel: {
        formatter: (value: string) => dayjs(value).format('HH:mm'),
        color: p.mutedForeground,
        fontSize: 10,
        interval: Math.max(0, Math.floor(hourly.length / 6) - 1),
      },
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      splitLine: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: p.mutedForeground,
        fontSize: 10,
        formatter: (v: number) => `${v}m`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: p.border, type: 'dashed', opacity: 0.5 },
      },
    },
    series: [
      {
        name: '潮高',
        data: hourly.map((point) => Number(point.height)),
        type: 'line',
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: p.primary, width: 2.5 },
        itemStyle: { color: p.primary },
        // hover 时 echarts 6 默认会把 series 切到 emphasis,把面积 + markPoint
        // 推到 blur 态(opacity 接近 0),整张图看似变白消失。显式禁用 emphasis
        // 并把 blur 锁回原透明度,确保 hover 时图形保持稳定
        emphasis: { disabled: true },
        blur: {
          areaStyle: { opacity: 1 },
          itemStyle: { opacity: 1 },
          lineStyle: { opacity: 1 },
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(p.primary, 0.18) },
              { offset: 0.7, color: withAlpha(p.primary, 0.04) },
              { offset: 1, color: withAlpha(p.primary, 0) },
            ],
          },
        },
        markLine:
          currentTimeIndex >= 0
            ? {
                symbol: ['none', 'none'],
                lineStyle: { color: p.warning, type: 'dashed', width: 1 },
                label: {
                  show: true,
                  formatter: '现在',
                  color: p.warning,
                  fontWeight: 600,
                  fontSize: 10,
                  position: 'insideEndTop',
                },
                data: [{ xAxis: currentTimeIndex }],
              }
            : undefined,
        markPoint: {
          symbol: 'circle',
          symbolSize: 9,
          data: markPointData,
          // dot 风格:实心圆 + 卡片色描边,hover 时的数据走 tooltip 不走 label,
          // 避免在曲线上叠一个大标签挡住波形
          itemStyle: {
            borderColor: p.card,
            borderWidth: 2,
          },
          label: { show: false },
        },
      },
    ],
  };
});

onMounted(() => {
  if (!panelTideData.value) {
    void fishingMapStore.fetchPanelTide(
      selectedHarborState.value,
      selectedDateState.value,
    );
  }
});
</script>

<template>
  <FishingCard>
    <!-- Header -->
    <div class="mb-4 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-foreground text-lg font-semibold tracking-tight">
          潮汐预报
        </h3>
        <p class="text-muted-foreground mt-0.5 truncate text-sm">
          {{ tideSpotName }} · {{ todayStr }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <select
          v-model="selectedHarbor"
          class="border-border bg-card text-foreground focus:ring-primary cursor-pointer rounded-lg border px-1.5 py-1 text-xs focus:ring-1 focus:outline-none"
        >
          <option v-for="opt in HARBOR_OPTIONS" :key="opt.code" :value="opt.code">
            {{ opt.name }}
          </option>
        </select>
        <select
          v-model="selectedDate"
          class="border-border bg-card text-foreground focus:ring-primary cursor-pointer rounded-lg border px-1.5 py-1 text-xs focus:ring-1 focus:outline-none"
        >
          <option v-for="opt in dateOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }} {{ opt.weekday }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex flex-1 flex-col items-center justify-center py-12"
    >
      <div
        class="border-border border-t-primary h-10 w-10 animate-spin rounded-full border-2"
      />
      <span class="text-muted-foreground mt-3 text-sm">获取潮汐数据...</span>
    </div>

    <!-- Chart -->
    <div v-else-if="tideData">
      <v-chart :option="tideOptions" style="width: 100%; height: 240px" autoresize />

      <div class="mt-3 grid grid-cols-2 gap-3">
        <div class="bg-warning/10 border-warning/20 rounded-xl border p-3">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-warning text-xs font-medium">最高潮</p>
            <p class="text-muted-foreground text-xs tabular-nums">
              {{ highTide?.time ?? '--:--' }}
            </p>
          </div>
          <p class="text-foreground mt-1 text-base font-semibold tabular-nums">
            {{ highTide ? highTide.height.toFixed(2) : '--' }} m
          </p>
        </div>

        <div class="bg-primary/10 border-primary/20 rounded-xl border p-3">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-primary text-xs font-medium">最低潮</p>
            <p class="text-muted-foreground text-xs tabular-nums">
              {{ lowTide?.time ?? '--:--' }}
            </p>
          </div>
          <p class="text-foreground mt-1 text-base font-semibold tabular-nums">
            {{ lowTide ? lowTide.height.toFixed(2) : '--' }} m
          </p>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="flex flex-1 flex-col items-center justify-center py-8">
      <div
        class="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="text-muted-foreground h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p class="text-secondary-foreground text-sm">暂无潮汐数据</p>
    </div>
  </FishingCard>
</template>
