import errorAnimationData from '@/assets/error.json';
import successAnimationData from '@/assets/success.json';
import { useNotificationStore } from '@/stores/notificationState';
import { AnimatePresence, motion } from 'framer-motion';
import { useLottie } from 'lottie-react';
import { X } from 'lucide-react';
import { useEffect } from 'react';

const AnimationLayer = ({ type }: { type: string }) => {
  const animationData =
    type === 'success' ? successAnimationData : errorAnimationData;
  const options = {
    animationData,
    loop: false,
    autoplay: true,
  };
  const style = { width: 48, height: 48 };
  const { View } = useLottie(options, style);
  return View;
};

export function Notifier() {
  const notificationStore = useNotificationStore();

  const notifications = notificationStore.notifications;

  useEffect(() => {
    notifications.forEach((n) => {
      if (n.timeout) {
        const timer = setTimeout(() => {
          notificationStore.dismiss(n.id);
        }, n.timeout);
        return () => clearTimeout(timer); // 清理
      }
    });
  }, [notifications, notificationStore]);

  const toast = notifications.map((n, i) => {
    const offset = i * 20; // 每条通知向下偏移20px，形成堆叠效果

    return (
      <motion.div
        key={n.id}
        initial={{ opacity: 0, y: -40 - offset, scale: 0.9 }}
        animate={{
          opacity: 1,
          y: offset,
          scale: 1 - i * 0.05,
          zIndex: 9999 - i,
          pointerEvents: i > 2 ? 'none' : 'auto',
        }}
        exit={{ opacity: 0, y: -40, scale: 0.9 }}
        transition={{ type: 'spring', damping: 30, stiffness: 500 }}
        className="squircle absolute top-0 left-1/2 -translate-x-1/2 flex h-20 w-60 items-center justify-between gap-3 border border-slate-200/20 bg-white/80 text-slate-900 shadow-xl backdrop-blur-sm transition-colors duration-200 dark:border-gray-700/80 dark:bg-gray-900/80 dark:text-gray-100"
      >
        <AnimationLayer type={n.type} />

        <div className="flex-1 text-sm leading-snug font-semibold text-slate-600 dark:text-gray-100">
          {n.message}
        </div>
        <button
          className="mr-2 shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          onClick={() => notificationStore.dismiss(n.id)}
          aria-label="dismiss"
        >
          <X className="size-4" />
        </button>
      </motion.div>
    );
  });

  return (
    <div className="fixed top-4 left-1/2 z-9999 w-full -translate-x-1/2">
      <AnimatePresence mode="popLayout">{toast}</AnimatePresence>
    </div>
  );
}
