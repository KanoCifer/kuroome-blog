import { motion } from 'framer-motion';
interface DeviceHeaderProps {
  onClick: () => void;
}

export function DeviceHeader({ onClick }: DeviceHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 ml-12">
            <h1 className="text-2xl mt-2 font-family-dongfang font-bold text-gray-900 dark:text-white">
              DeviceTracker
            </h1>
          </div>
          <motion.button
            layoutId="nav-button"
            type="button"
            onClick={onClick}
            className="min-h-11 rounded-2xl shadow-md shadow-blue-500/50 bg-blue-900 px-6 font-family-dongfang text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700"
          >
            返回
          </motion.button>
        </div>
      </div>
    </header>
  );
}
