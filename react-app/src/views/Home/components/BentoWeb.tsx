import { BentoCard } from '@/components/bento/BentoCard';
import websitesData from '@/data/websites.json';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const websites = websitesData.sites as Website[];

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
    <BentoCard onClick={() => navigate('/websites')} className="cursor-pointer">
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase transition-colors duration-300 group-hover:text-foreground">
          Daily Pick
        </div>
        <div className="my-1 flex items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-card-foreground transition-colors duration-300 group-hover:bg-secondary">
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
          <h3 className="ml-2 text-lg leading-tight font-bold text-foreground transition-colors duration-300">
            {randomSite.name}
          </h3>
        </div>
        <div>
          <p className="line-clamp-2 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-card-foreground">
            {randomSite.description}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
