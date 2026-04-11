import { BentoCard } from '@/components/bento/BentoCard';
import { Earth } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoMap() {
  return (
    <Link to="/fishing-map" className="group block h-full">
      <BentoCard className="min-w-0 cursor-pointer p-5">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-500 ring-1 ring-blue-200/60 sm:size-12 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/20">
              <Earth className="size-6" />
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <div className="max-w-full overflow-hidden font-serif whitespace-pre text-gray-800 dark:text-white">
                Fishing Map
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-300 dark:group-hover:text-blue-200">
              Open <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </BentoCard>
    </Link>
  );
}
