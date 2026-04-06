import { CalendarDays } from 'lucide-react';

interface DayFilterProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const OPTIONS = [7, 30, 90] as const;

export function DayFilter({ selectedDays, onChange }: DayFilterProps) {
  return (
    <div className="w-full">
      <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
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
                  ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
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
