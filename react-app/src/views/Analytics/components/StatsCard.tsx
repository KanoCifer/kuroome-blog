import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  iconClassName: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
}: StatsCardProps) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-gray-200/60 bg-white/85 p-3.5 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}
        >
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {title}
        </span>
      </div>

      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        {subtitle}
      </p>
    </article>
  );
}
