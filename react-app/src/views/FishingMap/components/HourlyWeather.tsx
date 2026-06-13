import { useFishingMapStore } from '@/stores/fishingMapStore';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { HourlyWeatherChart } from './HourlyWeatherChart';

export function HourlyWeather() {
  const weatherHourly = useFishingMapStore((state) => state.weatherHourly);

  const option = useMemo(() => {
    if (!weatherHourly || weatherHourly.length === 0) {
      return {};
    }
    const xData = weatherHourly.map((item) =>
      dayjs(item.fxTime).format('HH:mm'),
    );
    const rainData = weatherHourly.map((item) => item.precip ?? 0);
    const tempData = weatherHourly.map((item) => item.temp ?? 0);

    return {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#333',
        fontSize: 13,
      },
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#1f2937', fontSize: 14 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'rgba(0,0,0,0.1)', type: 'dashed' },
        },
      },
      legend: {
        data: ['降水量 (mm)', '温度 (°C)'],
        top: 0,
        right: 10,
        itemWidth: 16,
        itemHeight: 6,
        itemGap: 20,
        textStyle: { color: '#6b7280', fontSize: 13 },
      },
      grid: {
        left: '6%',
        right: '4%',
        top: 40,
        bottom: 30,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xData,
        axisLine: { lineStyle: { color: '#e5e7eb', width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          position: 'left',
          max: 18,
          min: 0,
          nameTextStyle: { color: '#9ca3af', fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
        },
        {
          type: 'value',
          max: (value: { max: number }) => Math.round(value.max + 5),
          min: 0,
          position: 'right',
          nameTextStyle: { color: '#9ca3af', fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#9ca3af', fontSize: 11 },
        },
      ],
      visualMap: {
        type: 'piecewise',
        show: false,
        dimension: 0,
        seriesIndex: 2,
        pieces: [
          {
            gt: 20,
            lt: 28,
            color: 'rgba(255, 112, 0, 0.86)',
          },
        ],
      },
      series: [
        {
          name: '降水量 (mm)',
          type: 'bar',
          data: rainData,
          yAxisIndex: 0,
          barMaxWidth: 12,
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [4, 4, 0, 0],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', width: 1 },
            data: [
              {
                yAxis: 0.5,
                lineStyle: { color: '#94a3b8' },
                label: {
                  formatter: '小雨',
                  color: '#94a3b8',
                  position: 'start',
                },
              },
              {
                yAxis: 8,
                lineStyle: { color: '#3b82f6' },
                label: {
                  formatter: '中雨',
                  color: '#3b82f6',
                  position: 'start',
                },
              },
              {
                yAxis: 16,
                lineStyle: { color: '#f97316' },
                label: {
                  formatter: '大雨',
                  color: '#f97316',
                  position: 'start',
                },
              },
            ],
          },
        },
        {
          name: '温度 (°C)',
          type: 'line',
          data: tempData,
          yAxisIndex: 1,
          lineStyle: { width: 2.5, color: '#f97316' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(249, 115, 22, 0.1)' },
                { offset: 0.7, color: 'rgba(249, 115, 22, 0.05)' },
                { offset: 1, color: 'rgba(249, 115, 22, 0)' },
              ],
            },
          },
          smooth: 0.2,
          symbol: 'none',
          symbolSize: 6,
          itemStyle: { color: '#f97316', borderWidth: 2, borderColor: '#fff' },
          markArea: {
            silent: true,
            data: [
              [
                { yAxis: 20, itemStyle: { color: 'rgba(250, 204, 21, 0.1)' } },
                { yAxis: 28 },
              ],
            ],
          },
        },
      ],
    };
  }, [weatherHourly]);

  return (
    <div className="border-border/40 bg-secondary/80 relative rounded-2xl border p-4 shadow-sm backdrop-blur-sm">
      {/* 背景 */}
      <div className="from-primary/10 to-primary/5 pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-linear-to-br blur-3xl" />
      <div className="from-warning/15 to-warning/5 pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-linear-to-tr blur-2xl" />
      {/* 内容区 */}
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            小时天气预报
            <span className="text-muted-foreground ml-1.5 text-xs">未来24小时</span>
          </h3>
          <p className="text-muted-foreground text-xs">天气变化趋势</p>
        </div>
        {/* 单行 inline legend */}
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-primary h-1.5 w-3 rounded" />
            降水
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-warning h-1.5 w-3 rounded" />
            温度
          </span>
        </div>
      </div>

      <div className="h-[240px]">
        {weatherHourly ? (
          <HourlyWeatherChart option={option} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="border-border border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2" />
              <p className="text-muted-foreground text-sm">正在加载天气数据...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
