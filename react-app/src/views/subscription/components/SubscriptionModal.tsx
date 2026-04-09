import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SubscriptionModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function SubscriptionModal({
  isOpen,
  title,
  description,
  onClose,
  children,
}: SubscriptionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-0 inset-y-14 z-50 flex items-center justify-center p-3"
      >
        {/* 背景遮罩层，点击时关闭弹窗 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          type="button"
          aria-label="关闭弹窗"
          className="fixed inset-0 bg-gray-950/55 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative z-10 w-full max-w-[44rem] overflow-hidden rounded-2xl border border-white/35 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200/80 px-4 py-3 dark:border-slate-700">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {description ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              关闭
            </button>
          </div>
          <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}
