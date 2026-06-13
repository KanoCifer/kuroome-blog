<script setup lang="ts">
import { useChartColors, withAlpha } from '@/composables/useChartColors';
import { useFishingMapStore } from '@/stores/fishingMap';
import DashboardCard from '@/views/fishing/components/DashboardCard.vue';
import dayjs from 'dayjs';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import VChart from 'vue-echarts';

const fishingMapStore = useFishingMapStore();
const { weatherHourly } = storeToRefs(fishingMapStore);
const { palette } = useChartColors();

const chartOption = computed(() => {
  if (!weatherHourly.value || weatherHourly.value.length === 0) return {};
  const p = palette.value;

  const xData = weatherHourly.value.map((item) =>
    dayjs(item.fxTime).format('HH:mm'),
  );
  const rainData = weatherHourly.value.map((item) => item.precip ?? 0);
  const tempData = weatherHourly.value.map((item) => item.temp ?? 0);

  const tempMax = Math.max(...tempData);
  const tempMin = Math.min(...tempData);
  // 让温度线在图表中段震荡:min/max 各留 4-6 度余量,避免线贴边
  const tempAxisMin = Math.floor(tempMin - 4);
  const tempAxisMax = Math.ceil(tempMax + 4);
  // 降雨轴:大多数情况降水都很小,只在有数据时撑大,空数据保持 8mm 基线
  const rainPeak = Math.max(...rainData);
  const rainAxisMax = Math.max(8, Math.ceil(rainPeak * 1.6));

  return {
    backgroundColor: 'transparent',
    // 关键:禁用 animation 避免 setOption 触发 interpolate1DArray 死循环
    // (palette 已稳定引用,正常不会反复 setOption;但 v-chart 在 props 变更时
    //  仍可能用 mergeOption 走 animation 通路,此处明确关掉)
    animation: false,
    textStyle: { color: p.foreground, fontSize: 12 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.card,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: [10, 14],
      textStyle: { color: p.foreground, fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: p.border, type: 'dashed', width: 1 },
      },
      // 自定义 formatter 让数字带单位,温度优先
      formatter: (params: unknown) => {
        const arr = params as Array<{
          axisValue: string;
          seriesName: string;
          data: number;
          marker: string;
        }>;
        const time = arr[0]?.axisValue ?? '';
        const lines = arr
          .map((it) => {
            const unit = it.seriesName.includes('温度') ? '°C' : 'mm';
            return `<div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              ${it.marker}
              <span style="color:${p.mutedForeground};font-size:11px;">${it.seriesName.replace(/\s*\(.+?\)/, '')}</span>
              <span style="font-weight:600;margin-left:auto;">${it.data}${unit}</span>
            </div>`;
          })
          .join('');
        return `<div style="font-weight:600;font-size:11px;color:${p.mutedForeground};margin-bottom:4px;">${time}</div>${lines}`;
      },
    },
    legend: { show: false }, // header 区已有 legend pill
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: xData,
      axisLine: { lineStyle: { color: p.border, width: 1 } },
      axisTick: { show: false },
      axisLabel: {
        color: p.mutedForeground,
        fontSize: 10,
        // 24h 数据,每隔 4h 显示一个标签 (共 6-7 个),避免拥挤
        interval: Math.max(0, Math.floor(xData.length / 6) - 1),
      },
    },
    yAxis: [
      // 左轴 - 降水 (主轴显示)
      {
        type: 'value',
        position: 'left',
        min: 0,
        max: rainAxisMax,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: p.border, type: 'dashed', opacity: 0.5 },
        },
        axisLabel: {
          color: p.mutedForeground,
          fontSize: 10,
          formatter: (v: number) => `${v}mm`,
        },
        splitNumber: 3,
      },
      // 右轴 - 温度
      {
        type: 'value',
        position: 'right',
        min: tempAxisMin,
        max: tempAxisMax,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: p.warning,
          fontSize: 10,
          formatter: (v: number) => `${v}°`,
        },
        splitNumber: 3,
      },
    ],
    series: [
      {
        name: '降水量',
        type: 'bar',
        data: rainData,
        yAxisIndex: 0,
        barMaxWidth: 18,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(p.primary, 0.95) },
              { offset: 1, color: withAlpha(p.primary, 0.55) },
            ],
          },
          borderRadius: [3, 3, 0, 0],
        },
        // hover 温度线时 axis tooltip 会触发整图 blur,显式把 bar 的 blur 态
        // 锁回原色,避免 echarts 6 默认把 opacity 压到 ~0 → 柱形看似消失
        emphasis: { disabled: true },
        blur: { itemStyle: { opacity: 1 } },
      },
      {
        name: '温度',
        type: 'line',
        data: tempData,
        yAxisIndex: 1,
        lineStyle: { width: 2, color: p.warning },
        // 温度只画线 + 圆点,不再填充面积 (面积会盖住降雨柱)
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: false, // 默认隐藏,hover 时显示
        itemStyle: { color: p.warning, borderWidth: 2, borderColor: p.card },
        smooth: 0.3,
        // 不能用 focus: 'series' —— echarts 6 会把 bar 推到 blur 态
        // (opacity ≈ 0) 导致柱形 hover 时整片消失。改 'self' 只高亮线本身
        emphasis: { focus: 'self' },
        z: 3,
      },
    ],
  };
});
</script>

<template>
  <DashboardCard>
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-foreground text-lg font-semibold tracking-tight">
          小时天气预报
          <span class="text-muted-foreground ml-1.5 text-xs font-normal">
            未来 24 小时
          </span>
        </h3>
        <p class="text-muted-foreground mt-0.5 text-sm">降水柱 · 温度线</p>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="bg-muted/40 flex items-center gap-1.5 rounded-full px-2.5 py-1"
        >
          <span class="bg-primary h-2 w-2 rounded-full" />
          <span class="text-foreground text-xs">降水</span>
        </div>
        <div
          class="bg-muted/40 flex items-center gap-1.5 rounded-full px-2.5 py-1"
        >
          <span class="bg-warning h-2 w-2 rounded-full" />
          <span class="text-foreground text-xs">温度</span>
        </div>
      </div>
    </div>

    <div
      v-if="weatherHourly && weatherHourly.length > 0"
      class="relative flex-1"
    >
      <v-chart
        :option="chartOption"
        style="width: 100%; height: 280px"
        autoresize
      />
    </div>
    <div v-else class="flex flex-1 items-center justify-center py-8">
      <div class="text-center">
        <div
          class="border-border border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2"
        />
        <p class="text-muted-foreground text-sm">正在加载天气数据...</p>
      </div>
    </div>
  </DashboardCard>
</template>
