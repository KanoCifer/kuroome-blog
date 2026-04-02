import { BentoCard } from '@/components/bento/BentoCard';
import { Link } from 'react-router-dom';

export function BentoProfile() {
  return (
    <BentoCard>
      <div className="flex items-center gap-5">
        {/* <!-- Avatar with Glow --> */}
        <div className="relative shrink-0">
          {/* 青/蓝色渐变 */}
          <div className="absolute -inset-1 rounded-full bg-linear-to-br from-cyan-300 to-blue-400 opacity-50 blur"></div>
          <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/50 dark:ring-slate-700/50">
            <img
              src="/images/about.webp"
              alt="Kuroome"
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          </div>
          <div className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-100 dark:border-slate-800 dark:bg-green-900">
            <svg
              className="h-3 w-3 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <Link to="/about" className="absolute inset-0 rounded-full"></Link>
        </div>

        {/* <!-- Content --> */}
        <div className="flex flex-col items-start text-left">
          <h2 className="font-serif text-2xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100">
            Kuroome
          </h2>
          <p className="font-medium text-gray-600 dark:text-gray-400">
            Developer
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
            <span className="text-xs font-semibold tracking-widest text-green-700 uppercase dark:text-green-400">
              Active Now
            </span>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
