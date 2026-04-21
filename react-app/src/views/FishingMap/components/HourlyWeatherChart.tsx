// import the core library.
import ReactEChartsCore from 'echarts-for-react';
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import * as echarts from 'echarts/core';
// Import charts, all with Chart suffix
import { LineChart } from 'echarts/charts';
// import components, all suffixed with Component
import {
  // GridSimpleComponent,
  GridComponent,
  MarkAreaComponent,
  // AxisPointerComponent,
  // BrushComponent,
  TitleComponent,
  // MarkAreaComponent
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
import { SVGRenderer } from 'echarts/renderers';

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LineChart,
  SVGRenderer,
  MarkAreaComponent,
]);

interface HourlyWeatherChartProps {
  option: Record<string, unknown>;
}

export function HourlyWeatherChart({ option }: HourlyWeatherChartProps) {
  return <ReactEChartsCore option={option} notMerge lazyUpdate />;
}
