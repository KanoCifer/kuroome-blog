import { BentoCard } from '@/components/bento/BentoCard';
import { Link } from 'react-router-dom';

export function BentoReadingList() {
  return (
    <Link to="/readinglist" className="group block h-full">
      <BentoCard className="min-w-0 cursor-pointer p-5 sm:p-6">
        <div className="flex h-full flex-col justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 ring-1 ring-orange-200/60 sm:size-12 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-500/20">
            <svg
              className="size-5 sm:size-6"
              viewBox="0 0 1024 1024"
              width="24"
              height="24"
            >
              <path
                d="M352 224C371.2 224 384 211.2 384 192L384 96C384 76.8 371.2 64 352 64 332.8 64 320 76.8 320 96L320 192C320 211.2 332.8 224 352 224zM704 224c19.2 0 32-12.8 32-32L736 96C736 76.8 723.2 64 704 64c-19.2 0-32 12.8-32 32L672 192C672 211.2 684.8 224 704 224zM864 864c0 19.2-12.8 32-32 32L192 896c-19.2 0-32-12.8-32-32L160 384l704 0L864 864zM844.8 128l-44.8 0C780.8 128 768 140.8 768 160 768 179.2 780.8 192 800 192l44.8 0c6.4 0 19.2 12.8 19.2 32L864 320l-704 0L160 224C160 204.8 172.8 192 192 192l64 0c19.2 0 32-12.8 32-32C288 140.8 275.2 128 256 128L192 128C140.8 128 96 172.8 96 224l0 640C96 915.2 140.8 960 192 960l640 0c51.2 0 96-44.8 96-96l0-640C928 172.8 889.6 128 844.8 128zM448 192l160 0C627.2 192 640 179.2 640 160 640 140.8 627.2 128 608 128L448 128C428.8 128 416 140.8 416 160 416 179.2 428.8 192 448 192zM256 768l512 0c19.2 0 32-12.8 32-32 0-19.2-12.8-32-32-32L256 704c-19.2 0-32 12.8-32 32C224 755.2 236.8 768 256 768zM256 576l512 0c19.2 0 32-12.8 32-32C800 524.8 787.2 512 768 512L256 512C236.8 512 224 524.8 224 544 224 563.2 236.8 576 256 576z"
                fill="currentColor"
              />
            </svg>
          </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                Reading
              </div>
              <div className="truncate font-serif text-base text-neutral-900 sm:text-lg dark:text-white">
                Reading List
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="hidden min-w-0 truncate sm:block">
              Saved highlights and articles
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-orange-600 transition-colors group-hover:text-orange-700 dark:text-orange-300 dark:group-hover:text-orange-200">
              Open <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </BentoCard>
    </Link>
  );
}
