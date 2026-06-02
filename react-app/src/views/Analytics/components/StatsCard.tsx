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
    <article className="group border-border/60 bg-card/85 overflow-hidden rounded-3xl border p-3.5 shadow-sm transition-all duration-300">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}
        >
          {icon}
        </div>
        <span className="text-muted-foreground text-xs font-medium">
          {title}
        </span>
      </div>

      <p className="text-foreground text-xl font-bold">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[11px]">{subtitle}</p>
    </article>
  );
}
