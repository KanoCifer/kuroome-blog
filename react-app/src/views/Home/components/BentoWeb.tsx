import { BentoCard } from '@/components/bento/BentoCard';
import websitesData from '@/data/websites.json';
import { useState } from 'react';

export function BentoWeb() {
  interface Website {
    id: string;
    name: string;
    description: string;
    url: string;
    icon: string;
    category: string;
    tags: string[];
  }

  const websites = websitesData.sites;

  // 直接在渲染时计算随机网站，无需 Effect
  const [randomSite] = useState(
    () => websites[Math.floor(Math.random() * websites.length)] as Website,
  );

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <BentoCard>
      <div className="relative z-10 flex h-full flex-col justify-between px-6 py-4 max-sm:px-2 max-sm:py-1">
        <div className="text-xs font-bold tracking-wide text-neutral-500 uppercase transition-colors duration-300 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300">
          Daily Pick
        </div>
        <div className="my-1 flex items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors duration-300 group-hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:group-hover:bg-neutral-600">
            {randomSite.icon && (
              <img
                src={randomSite.icon}
                alt={randomSite.name}
                onError={handleImageError}
                className="h-6 w-6 object-contain"
              />
            )}
            {!randomSite.icon && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0 3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            )}
          </div>
          <h3 className="ml-2 text-lg leading-tight font-bold text-neutral-800 transition-colors duration-300 group-hover:text-neutral-950 dark:text-neutral-100 dark:group-hover:text-white">
            {randomSite.name}
          </h3>
        </div>
        <div>
          <p className="line-clamp-2 text-sm text-neutral-500 transition-colors duration-300 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300">
            {randomSite.description}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
