import { BentoCard } from '@/components/bento/BentoCard';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

export function BentoClock() {
  const [timeLabel, setTimeLabel] = useState<string>('--:--');
  const [dateLabel, setDateLabel] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = dayjs();
      setTimeLabel(now.format('HH:mm'));
      setDateLabel(now.format('YYYY-MM-DD'));
    };

    updateTime(); // 初始化时立即更新一次
    const timerId = setInterval(updateTime, 1000); // 每秒更新一次

    return () => clearInterval(timerId); // 组件卸载时清除定时器
  }, []);

  return (
    <BentoCard className="h-full">
      <div>
        <svg
          className="text-primary h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <div className="text-foreground font-serif text-4xl font-extrabold tracking-tighter tabular-nums">
          {timeLabel}
        </div>
        <div className="text-muted-foreground mt-1 text-sm font-medium">
          {dateLabel}
        </div>
      </div>
    </BentoCard>
  );
}
