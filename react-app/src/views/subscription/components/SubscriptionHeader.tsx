import { motion } from 'framer-motion';
interface SubscriptionHeaderProps {
  onClick: () => void;
}

export function SubscriptionHeader({ onClick }: SubscriptionHeaderProps) {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-10 border-b px-4 py-4 backdrop-blur-md">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="ml-12 space-y-1">
            <h1 className="text-foreground mt-2 font-serif text-2xl font-semibold text-shadow-lg">
              SubTracker
            </h1>
          </div>
          <motion.button
            type="button"
            onClick={onClick}
            className="font-family-dongfang bg-primary text-primary-foreground shadow-primary/50 hover:bg-primary/90 min-h-11 rounded-2xl px-6 text-sm font-medium shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            前往Device
          </motion.button>
        </div>
      </div>
    </header>
  );
}
