import { BentoCard } from '@/components/bento/BentoCard';
import { Earth } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoMap() {
  return (
    <Link to="/fishing-map" className="block">
      <BentoCard className="min-w-0 cursor-pointer">
        <div className="min-w-0 flex flex-col items-start gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Earth className="size-6 text-blue-500" />
            </div>
            <span className="max-w-full truncate font-serif text-sm text-gray-800 sm:text-xl dark:text-white">
              MyFishMap
            </span>
          </div>
          <span className="text-xs text-blue-500 dark:text-blue-400">
            Open<span aria-hidden="true">→</span>
          </span>
        </div>
      </BentoCard>
    </Link>
  );
}
