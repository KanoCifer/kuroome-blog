import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  children,
}: SubscriptionModalProps) {
  if (!isOpen) return null;

  return createPortal(
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
        className="bg-background/55 fixed inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-card relative z-10 flex max-h-[calc(100dvh-8rem)] w-full max-w-176 flex-col overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </motion.div>,
    document.body,
  );
}
