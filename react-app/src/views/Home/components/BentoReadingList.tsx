import { BentoCard } from '@/components/bento/BentoCard';
import { ListCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoReadingList() {
  return (
    <Link to="/readinglist" className="group block h-full">
      <BentoCard className="min-w-0 cursor-pointer p-5">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-warning/10 text-warning ring-warning/20 flex size-10 items-center justify-center rounded-2xl ring-1 sm:size-12">
              <ListCheck className="size-6" />
            </div>
            <div className="flex min-w-0 flex-col items-start">
              <div className="text-foreground max-w-full overflow-hidden font-serif whitespace-pre">
                书单
              </div>
            </div>
          </div>
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span className="text-warning group-hover:text-warning/80 inline-flex items-center gap-1 font-semibold transition-colors">
              Open <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </BentoCard>
    </Link>
  );
}
