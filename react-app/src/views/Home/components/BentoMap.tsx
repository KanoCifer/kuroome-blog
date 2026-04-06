import { BentoCard } from '@/components/bento/BentoCard';
import { Earth } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoMap() {
  return (
    <Link to="/fishing-map" className="group block h-full">
      <BentoCard className="min-w-0 cursor-pointer">
        <div className="min-w-0 flex flex-col items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Earth className="size-6 text-blue-500" />
            </div>
            <span className="max-w-full truncate font-serif text-gray-800 dark:text-white">
              MyFishMap
            </span>
          </div>
          <div className="flex justify-start">
            <span className="text-xs text-blue-500 dark:text-blue-400">
              Open <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </BentoCard>
    </Link>
  );
}
