import { BentoCard } from '@/components/bento/BentoCard';
import { ListCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoReadingList() {
  return (
    <Link to="/readinglist" className="group block h-full">
      <BentoCard className="min-w-0 cursor-pointer p-5 sm:p-6">
        <div className="flex h-full flex-col justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 ring-1 ring-orange-200/60 sm:size-12 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-500/20">
              <ListCheck className="size-6" />
            </div>
            <div className="min-w-0 flex flex-col items-start gap-1">
              <div className="truncate font-serif text-base text-neutral-900 sm:text-lg dark:text-white">
                Reading
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1 font-semibold text-orange-600 transition-colors group-hover:text-orange-700 dark:text-orange-300 dark:group-hover:text-orange-200">
              Open <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </BentoCard>
    </Link>
  );
}
