import { BentoCard } from '@/components/bento/BentoCard';
import dayjs from 'dayjs';

export function BentoCalendar() {
  const now = dayjs();
  const monthLabel = now.format('MMMM');
  const yearLabel = now.format('YYYY');

  const weekday = now.day(); // 0-6, 0是周日
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayHeaders = weekdayLabels.map((label, idx) => (
    <span
      key={idx}
      className={`py-1 text-xs font-medium ${
        idx === weekday
          ? 'rounded-2xl bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          : ''
      }`}
    >
      {label}
    </span>
  ));

  const startOffset = () => {
    const offset = now.startOf('month').day();

    const offsetArray = new Array(offset).fill(0);

    return offsetArray.map((_, idx) => <span key={idx}></span>);
  };

  const daysInMonthArray = new Array(now.daysInMonth()).fill(0);
  const daysInMonth = daysInMonthArray.map((_, idx) => {
    const dayNum = idx + 1;
    const isToday = dayNum === now.date();

    return (
      <span
        key={idx}
        className={`mx-auto flex aspect-square w-full max-w-8 items-center justify-center rounded-full text-sm transition-colors ${
          isToday
            ? 'bg-blue-500 font-bold text-white'
            : 'text-slate-700 hover:bg-blue-100 dark:text-slate-300 dark:hover:bg-blue-900/30'
        }`}
      >
        {dayNum}
      </span>
    );
  });

  return (
    <BentoCard className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {monthLabel}
        </h3>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {yearLabel}
        </span>
      </div>
      {/* 表头 */}
      <div className="mb-1 grid grid-cols-7 text-center">{weekdayHeaders}</div>

      {/* 日期部分 */}
      <div className="grid grid-cols-7 text-center">
        {startOffset()}
        {daysInMonth}
      </div>
    </BentoCard>
  );
}
