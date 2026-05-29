import { CalendarDays } from 'lucide-react';

interface DayFilterProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const OPTIONS = [7, 30, 90] as const;

export function DayFilter({ selectedDays, onChange }: DayFilterProps) {
  return (
    <div className="w-full">
      <p className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <CalendarDays className="h-3.5 w-3.5" />
        Time Window
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const active = option === selectedDays;
          return (
            <button
              key={option}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-card-foreground'
              }`}
              onClick={() => onChange(option)}
              type="button"
            >
              {option}d
            </button>
          );
        })}
      </div>
    </div>
  );
}
