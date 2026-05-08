<script setup lang="ts">
import { analyticsService } from "@/service/analyticsService";
import type { ChartConfig } from "@/components/ui/chart";
import { computed, ref, watch } from "vue";

// import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VisArea, VisAxis, VisLine, VisXYContainer } from "@unovis/vue";

type DailyTrend = {
  date: string;
  count: number;
};

type OverviewResponse = {
  total_visits: number;
  unique_visitors: number;
  unique_visitor_ids: number;
  top_pages: { page_path: string; count: number }[];
  browser_stats: { browser: string; count: number }[];
  daily_trend: DailyTrend[];
  period_days: number;
};

type ChartPoint = {
  date: Date;
  visits: number;
};

const chartConfig = {
  visits: {
    label: "Visits",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const svgDefs = `
  <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
    <stop
      offset="5%"
      stop-color="var(--color-visits)"
      stop-opacity="0.8"
    />
    <stop
      offset="95%"
      stop-color="var(--color-visits)"
      stop-opacity="0.1"
    />
  </linearGradient>
`;

const timeRange = ref("90d");
const chartData = ref<DailyTrend[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const daysMap: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

async function fetchData() {
  const days = daysMap[timeRange.value] || 90;
  loading.value = true;
  error.value = null;
  try {
    const response = await analyticsService.getOverview(days);
    chartData.value = (response.data as OverviewResponse).daily_trend || [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load data";
    chartData.value = [];
  } finally {
    loading.value = false;
  }
}

// Fetch data when timeRange changes
watch(timeRange, () => {
  fetchData();
});

// Initial fetch
fetchData();

const filterRange = computed<ChartPoint[]>(() => {
  return chartData.value
    .map((item) => ({
      date: new Date(item.date),
      visits: item.count,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
});

// Compute Y domain based on data
const yDomain = computed<[number, number]>(() => {
  if (filterRange.value.length === 0) return [0, 100];
  const maxVisits = Math.max(...filterRange.value.map((d) => d.visits));
  return [0, Math.ceil(maxVisits * 1.1)];
});
</script>

<template>
  <Card class="pt-0">
    <CardHeader
      class="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row"
    >
      <div class="grid flex-1 gap-1">
        <CardTitle>Area Chart - Interactive</CardTitle>
        <CardDescription>
          Showing total visitors for the last 3 months
        </CardDescription>
      </div>
      <Select v-model="timeRange">
        <SelectTrigger
          class="hidden w-40 rounded-lg sm:ml-auto sm:flex"
          aria-label="Select a value"
        >
          <SelectValue placeholder="Last 3 months" />
        </SelectTrigger>
        <SelectContent class="rounded-xl">
          <SelectItem value="90d" class="rounded-lg">
            Last 3 months
          </SelectItem>
          <SelectItem value="30d" class="rounded-lg"> Last 30 days </SelectItem>
          <SelectItem value="7d" class="rounded-lg"> Last 7 days </SelectItem>
        </SelectContent>
      </Select>
    </CardHeader>
    <CardContent class="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
      <div v-if="loading" class="flex h-62.5 items-center justify-center">
        <div class="text-muted-foreground">Loading...</div>
      </div>
      <div v-else-if="error" class="flex h-62.5 items-center justify-center">
        <div class="text-red-500">{{ error }}</div>
      </div>
      <ChartContainer
        v-else
        :config="chartConfig"
        class="aspect-auto h-62.5 w-full"
        :cursor="false"
      >
        <VisXYContainer
          :data="filterRange"
          :svg-defs="svgDefs"
          :margin="{ left: -40 }"
          :y-domain="yDomain"
        >
          <VisArea
            :x="(d: ChartPoint) => d.date"
            :y="(d: ChartPoint) => d.visits"
            color="url(#fillVisits)"
            :opacity="0.6"
          />
          <VisLine
            :x="(d: ChartPoint) => d.date"
            :y="(d: ChartPoint) => d.visits"
            :color="chartConfig.visits.color"
            :line-width="1"
          />
          <VisAxis
            type="x"
            :x="(d: ChartPoint) => d.date"
            :tick-line="false"
            :domain-line="false"
            :grid-line="false"
            :num-ticks="6"
            :tick-format="
              (d: number) => {
                const date = new Date(d);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }
            "
          />
          <VisAxis
            type="y"
            :num-ticks="3"
            :tick-line="false"
            :domain-line="false"
          />
          <ChartTooltip />
          <ChartCrosshair
            :template="
              componentToString(chartConfig, ChartTooltipContent, {
                labelFormatter: (d) => {
                  return new Date(d).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                },
              })
            "
            :color="() => chartConfig.visits.color"
          />
        </VisXYContainer>

        <ChartLegendContent />
      </ChartContainer>
    </CardContent>
  </Card>
</template>
