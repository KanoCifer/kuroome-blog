<template>
  <div
    class="border-border/60 bg-background h-full rounded-3xl border p-6 shadow-sm"
  >
    <h2 class="text-foreground mb-4 flex items-center gap-2 text-lg font-bold">
      <icon-analytics class="size-6" /> Browser Distribution
    </h2>
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
import { computed } from 'vue';
import VChart from 'vue-echarts';

interface BrowserStat {
  browser_name: string;
  browser_version: string;
  count: number;
}

interface Props {
  loading: boolean;
  browserStats: BrowserStat[] | null;
}

const props = defineProps<Props>();

const hasBrowserData = computed(
  () => (props.browserStats ?? []).length > 0,
);

const browserChartOption = computed(() => {
  const rawData = props.browserStats ?? [];

  // 按访问量降序排序，取前9个，其余合并为Others（总共最多10项）
  const sortedData = [...rawData].sort((a, b) => b.count - a.count);
  let processedData: BrowserStat[] = [];

  if (sortedData.length <= 10) {
    processedData = sortedData;
  } else {
    const top9 = sortedData.slice(0, 9);
    const othersCount = sortedData
      .slice(9)
      .reduce((sum, item) => sum + item.count, 0);
    processedData = [
      ...top9,
      {
        browser_name: 'Others',
        browser_version: '',
        count: othersCount,
      },
    ];
  }

  const colorPalette = [
    '#3b82f6', // Chrome 蓝
    '#ea4335', // Edge/Google 红
    '#4285f4', // Firefox 蓝
    '#fbbd00', // Safari 黄
    '#00bfa5', // Opera 青
    '#7b1fa2', // IE 紫
    '#f06292', // 其他浏览器 粉
    '#ff9800', // 橙
  ];

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: {
        color: '#374151',
      },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: {
        color: '#6b7280',
      },
    },
    series: [
      {
        name: 'Browser',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['65%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: processedData.map((item, index) => ({
          value: item.count,
          name: item.browser_name
            ? `${item.browser_name} ${item.browser_version || ''}`.trim()
            : 'Unknown',
          itemStyle: {
            color: colorPalette[index % colorPalette.length],
          },
        })),
      },
    ],
  };
});
</script>

<style scoped></style>
