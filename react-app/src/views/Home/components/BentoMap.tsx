import { BentoCard } from '@/components/bento/BentoCard';
import { Link } from 'react-router-dom';

function IconGlobal({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M4 20.8404C7.01485 19.4168 9.24466 19.2185 10.6894 20.2454C12.8566 21.7859 13.1283 28.064 18.0575 25.0635C22.9867 22.063 15.9467 20.8404 17.475 16.4939C19.0033 12.1474 24.0083 15.5237 24.5059 10.7627C24.8375 7.58862 21.0408 6.37413 13.1156 7.11921"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M36.0001 8C30.2857 12.9886 28.2899 16.0011 30.0127 17.0373C32.5968 18.5917 33.6933 16.4033 36.8467 17.0373C40.0001 17.6714 39.3173 21.9457 37.6587 21.9457C36.0001 21.9457 27.41 20.8518 27.8427 25.865C28.2753 30.8781 33.4422 31.6203 33.4422 34.4211C33.4422 36.2883 32.299 39.146 30.0127 42.9942"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M6.10449 32.9264C7.01598 32.5288 7.70115 32.2374 8.15999 32.052C12.0071 30.4978 14.8617 30.1314 16.7236 30.953C20.0161 32.4059 18.7503 35.3401 19.7816 36.4211C20.8128 37.5021 23.388 37.1876 23.388 39.244C23.388 40.615 22.9275 42.1637 22.0065 43.8901"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BentoMap() {
  return (
    <Link to="/fishing-map" className="block">
      <BentoCard className="min-w-0 cursor-pointer">
        <div className="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <IconGlobal className="size-6 text-blue-500 max-sm:mr-2" />
          </div>
          <span className="max-w-full truncate font-serif text-sm text-gray-800 sm:text-xl dark:text-white">
            MyFishingMAP
          </span>
        </div>
      </BentoCard>
    </Link>
  );
}
