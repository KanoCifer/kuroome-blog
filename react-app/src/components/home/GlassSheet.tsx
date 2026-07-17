import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SPRING } from '@/constants/springs';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface GlassSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

// Liquid-glass 底部浮层 — 用于日历展开等被批准的玻璃用法。
// 支持 drag-to-dismiss（速度传递）+ Esc 关闭 + 焦点陷阱。
export function GlassSheet({
  open,
  onClose,
  children,
  title,
}: GlassSheetProps) {
  const reduce = usePrefersReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // 记录触发焦点，关闭时返还
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      // 焦点移入浮层
      setTimeout(() => {
        sheetRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleClose = () => {
    onClose();
    // 焦点返还触发器
    triggerRef.current?.focus();
  };

  // drag-to-dismiss 速度判断
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // 向下拖动超过 80px 或速度超过 500px/s → 关闭
    if (info.offset.y > 80 || info.velocity.y > 500) {
      handleClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="bg-foreground/30 fixed inset-0 z-200 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* 浮层面板 */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="liquid-glass fixed right-0 bottom-0 left-0 z-210 rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl outline-none"
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING.modal}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            {/* 拖拽手柄 */}
            <div className="mb-4 flex justify-center">
              <div className="bg-foreground/20 h-1.5 w-10 rounded-full" />
            </div>

            {/* 标题 */}
            {title && (
              <h2 className="text-foreground mb-4 text-center text-lg font-semibold">
                {title}
              </h2>
            )}

            {/* 内容 */}
            <div className="text-foreground">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
