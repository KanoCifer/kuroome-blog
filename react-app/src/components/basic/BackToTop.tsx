import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface BackToTopProps {
  className?: string;
}

export function BackToTop({ className }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const rafRef = useRef<number | null>(null);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
    // console.log(
    //   `scrollTop: ${scrollTop}, docHeight: ${docHeight}, pct: ${pct}`,
    // );
    setProgress(pct);
    setIsVisible(scrollTop > 300);
  };

  // 使用 requestAnimationFrame 节流，确保每帧只更新一次
  const onScroll = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      updateScroll();
      rafRef.current = null;
    });
  };

  useEffect(() => {
    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={backToTop}
            aria-label="回到顶部"
            title="回到顶部"
            className={`group z-50 flex h-14 w-14 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-2xl focus:outline-none ${className || 'fixed bottom-12 left-1/2 -translate-x-1/2'}`}
          >
            {/* 背景进度环 */}
            <svg
              className="text-primary absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 56 56"
              aria-hidden
            >
              {/* 背景圆环 */}
              <circle
                cx={28}
                cy={28}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-muted-foreground"
                opacity={0.3}
              />
              {/* 进度圆环 */}
              <circle
                cx={28}
                cy={28}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'none' }}
              />
            </svg>

            {/* 箭头图标 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground h-6 w-6 transform-gpu transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>

            {/* Tooltip */}
            <span className="bg-card text-card-foreground absolute right-full mr-3 rounded-lg px-3 py-1 text-sm whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              回到顶部
              <span className="border-l-card absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 border-4 border-transparent"></span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
