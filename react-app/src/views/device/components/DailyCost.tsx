import ReactEChartsCore from 'echarts-for-react';

import { type Device } from '@/services/deviceService';
import dayjs from 'dayjs';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  SVGRenderer,
]);

export function DailyCost({
  data,
  isOpen,
  onClose,
}: {
  data: Device;
  isOpen: boolean;
  onClose: () => void;
}) {
  // 响应主题切换
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // 图表配置项
  const option = useMemo(() => {
    const purchaseDate = dayjs(data.purchase_date);
    const now = dayjs();

    // 已使用天数（从购买日到今天）
    const usedDays = now.diff(purchaseDate, 'day');
    const currentDailyCost = usedDays > 0 ? data.price / usedDays : data.price;

    const predictDays = 180; // 预测未来180天的成本趋势
    const currentTimeIndex = usedDays; // 当前时间点在x轴上的索引

    const xAxisData = [];
    const seriesData = [];
    for (let i = 0; i <= usedDays + predictDays; i++) {
      const date = purchaseDate.add(i, 'day');
      xAxisData.push(date.format('YYYY-MM-DD'));
      const dailyCost = i > 0 ? data.price / i : data.price;
      seriesData.push(dailyCost);
    }

    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    const subtextColor = isDark ? '#9ca3af' : '#6b7280';
    const axisColor = isDark ? '#4b5563' : '#d1d5db';
    const splitLineColor = isDark ? '#374151' : '#f3f4f6';

    return {
      backgroundColor: 'transparent',
      title: {
        text: `Daily Cost Trend: ${data.name}`,
        subtext: `Current: ¥${currentDailyCost.toFixed(2)}/day | Total: ¥${data.price}`,
        left: 0,
        top: 8,
        textStyle: { fontSize: 16, fontWeight: 'bold', color: textColor },
        subtextStyle: { fontSize: 12, color: subtextColor },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1f2937' : '#fff',
        textStyle: { color: textColor },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `${p.name}<br/>Daily Cost: <b>¥${p.value.toFixed(2)}</b>`;
        },
      },
      grid: {
        top: '22%',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          interval: 30,
          rotate: 45,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'log',
        name: '¥/day',
        max: Math.ceil(data.price * 1.1),
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textColor },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: seriesData,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.35)' },
                { offset: 1, color: 'rgba(59,130,246,0.02)' },
              ],
            },
          },
          markLine:
            currentTimeIndex > 0
              ? {
                  symbol: ['none', 'none'],
                  lineStyle: {
                    color: '#f59e0b',
                    type: 'dashed',
                    width: 1.5,
                  },
                  label: {
                    show: true,
                    formatter: '现在',
                    color: '#f59e0b',
                    fontWeight: '600',
                    fontSize: 12,
                  },
                  data: [{ xAxis: currentTimeIndex }],
                }
              : undefined,
        },
      ],
    };
  }, [data, isDark]);

  return (
    <>
      {/* 遮罩 */}
      {isOpen &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
          />,
          document.body,
        )}

      {/* 图表区 */}
      {isOpen &&
        createPortal(
          <motion.div className="bg-card fixed top-1/2 left-1/2 z-60 h-[60vh] w-[90vw] max-w-md min-w-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-4">
            <button
              className="bg-destructive hover:bg-destructive/90 absolute top-4 right-4 z-50 rounded-full px-1.5 py-1.5 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <ReactEChartsCore
              option={option}
              style={{ width: '100%', height: '100%' }}
              notMerge
              lazyUpdate
            />
          </motion.div>,
          document.body,
        )}
    </>
  );
}
