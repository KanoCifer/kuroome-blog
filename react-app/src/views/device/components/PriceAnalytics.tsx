// import the core library.
import ReactEChartsCore from 'echarts-for-react';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import * as echarts from 'echarts/core';
// Import charts, all with Chart suffix
import { PieChart } from 'echarts/charts';
// import components, all suffixed with Component
import {
  // GridSimpleComponent,
  GridComponent,
  // AxisPointerComponent,
  // BrushComponent,
  TitleComponent,
  // PolarComponent,
  // RadarComponent,
  // GeoComponent,
  // SingleAxisComponent,
  // ParallelComponent,
  // CalendarComponent,
  // GraphicComponent,
  // ToolboxComponent,
  TooltipComponent,
} from 'echarts/components';
// Import renderer, note that introducing the CanvasRenderer or SVGRenderer is a required step
import { type Device } from '@/services/deviceService';
import { SVGRenderer } from 'echarts/renderers';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  PieChart,
  SVGRenderer,
]);

const isDark = document.documentElement.classList.contains('dark');

export function PriceAnalytics({
  data,
  isOpen,
  onClose,
}: {
  data: Device[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const option = useMemo(() => {
    return {
      title: {
        text: 'Device Price Distribution',
        left: 0,
        top: 15,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: isDark ? '#ccc' : 'rgb(50, 50, 50)',
        },
      },
      tooltip: {
        trigger: 'item',
      },
      legend: {
        top: 'bottom',
      },
      toolbox: {
        show: true,
        feature: {
          mark: { show: true },
          dataView: { show: true, readOnly: true },
          restore: { show: true },
          saveAsImage: { show: true },
        },
      },
      itemStyle: {
        borderRadius: 8,
      },
      series: [
        {
          color: [
            '#ee6666',
            '#73c0de',
            '#3ba272',
            '#fc8452',
            '#9a60b4',
            '#ea7ccc',
          ],

          type: 'pie',
          data: data.map((device) => ({
            name: device.name,
            value: device.price,
          })),
          roseType: 'area',
          colorBy: 'data',
          legendHoverLink: true,
        },
      ],
    };
  }, [data]);

  return (
    <>
      {isOpen &&
        createPortal(
          <motion.div
            className="bg-background/50 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />,
          document.body,
        )}

      {isOpen &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card fixed top-1/2 left-1/2 z-50 h-[60vh] w-[90vw] max-w-md min-w-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-4"
          >
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
