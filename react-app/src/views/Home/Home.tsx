import { useNavVisibility } from '@/components/basic/NavVisibilityContext';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { BentoCalendar } from './components/BentoCalendar';
import { BentoClock } from './components/BentoClock';
import { BentoGreeting } from './components/BentoGreeting';
import { BentoMap } from './components/BentoMap';
import { BentoMemo } from './components/BentoMemo';
import { BentoProfile } from './components/BentoProfile';
import { BentoReadingList } from './components/BentoReadingList';
import { BentoTech } from './components/BentoTech';
import { BentoTodo } from './components/BentoTodo';
import { BentoWeb } from './components/BentoWeb';

export default function Home() {
  const { showNav } = useNavVisibility();

  useEffect(() => {
    showNav();
    return () => showNav();
  }, [showNav]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white/70 dark:bg-slate-900/90">
      {/* Bento Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-wrap content-start gap-4 overflow-x-hidden px-6 pt-12 pb-32"
      >
        <div className="order-1 w-full min-w-0">
          <BentoProfile />
        </div>
        <div className="order-2 w-full min-w-0">
          <BentoGreeting />
        </div>
        <div className="order-3 w-[calc(50%-0.5rem)] min-w-0">
          <BentoClock />
        </div>
        <div className="order-4 w-[calc(50%-0.5rem)] min-w-0">
          <BentoMemo />
        </div>
        <div className="order-5 w-full min-w-0">
          <BentoCalendar />
        </div>
        <div className="order-6 w-full min-w-0">
          <BentoTech />
        </div>
        <div className="order-7 w-[calc(50%-0.5rem)] min-w-0">
          <BentoReadingList />
        </div>
        <div className="order-8 w-[calc(50%-0.5rem)] min-w-0">
          <BentoMap />
        </div>

        <div className="order-9 w-full min-w-0">
          <BentoTodo />
        </div>

        <div className="order-10 w-full min-w-0">
          <BentoWeb />
        </div>
      </motion.div>
    </div>
  );
}
