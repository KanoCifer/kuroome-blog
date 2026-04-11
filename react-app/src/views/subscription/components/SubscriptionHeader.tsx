import { motion } from 'framer-motion';
interface SubscriptionHeaderProps {
  onClick: () => void;
}

export function SubscriptionHeader({ onClick }: SubscriptionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="ml-12 space-y-1">
            <h1 className="font-family-dongfang mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              SubTracker
            </h1>
          </div>
          <motion.button
            type="button"
            onClick={onClick}
            className="font-family-dongfang min-h-11 rounded-2xl bg-blue-900 px-6 text-sm font-medium text-white shadow-md shadow-blue-500/50 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700"
          >
            前往Device
          </motion.button>
        </div>
      </div>
    </header>
  );
}
