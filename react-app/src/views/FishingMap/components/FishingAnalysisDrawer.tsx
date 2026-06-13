/**
 * AI 智能分析浮层。
 *
 * iPhone 移动端: 底部 sheet (88dvh, drag handle, 下滑关闭)
 * 桌面端 (≥ sm): 右侧抽屉 420px
 *
 * 内容区直接复用 AIAnalysisWidget 的「内嵌 + 无 FAB」模式（embedded + hideFab），
 * 这样状态、shimmer、model select、markdown 渲染都继续走 AnalysisContext。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { AIAnalysisWidget } from './AIAnalysisWidget';

interface FishingAnalysisDrawerProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (modelId: string) => void;
}

export function FishingAnalysisDrawer({
  open,
  onClose,
  onGenerate,
}: FishingAnalysisDrawerProps) {
  // 锁定背景滚动
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="bg-foreground/30 fixed inset-0 z-40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          {/* 移动端: 底部 sheet */}
          <motion.aside
            key="sheet-mobile"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border-border fixed inset-x-0 bottom-0 z-50 flex h-[50dvh] max-h-[50dvh] flex-col rounded-t-2xl border-t shadow-2xl sm:hidden"
            role="dialog"
            aria-label="AI 分析"
          >
            <SheetBody onClose={onClose} onGenerate={onGenerate} />
          </motion.aside>
          {/* 桌面端: 右侧抽屉 */}
          <motion.aside
            key="drawer-desktop"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border-border fixed top-0 right-0 z-50 hidden h-screen w-[420px] max-w-[90vw] flex-col border-l shadow-2xl sm:flex"
            role="dialog"
            aria-label="AI 分析"
          >
            <SheetBody
              onClose={onClose}
              onGenerate={onGenerate}
              variant="desktop"
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetBody({
  onClose,
  onGenerate,
  variant = 'mobile',
}: {
  onClose: () => void;
  onGenerate: (modelId: string) => void;
  variant?: 'mobile' | 'desktop';
}) {
  if (variant === 'mobile') {
    return (
      <>
        <div className="bg-muted-foreground/40 mx-auto mt-2 h-1 w-9 rounded-full" />
        <div className="border-border flex items-center justify-between border-b px-5 py-3">
          <div>
            <h3 className="text-foreground text-lg font-semibold">AI 分析</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              基于当前天气与潮汐综合判断
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭分析"
            onClick={onClose}
            className="hover:bg-accent text-muted-foreground inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
          <AIAnalysisWidget onGenerate={onGenerate} embedded hideFab />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="text-foreground font-family-averia text-lg">
            AI 分析
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            基于当前天气与潮汐综合判断
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭分析"
          onClick={onClose}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
        <AIAnalysisWidget onGenerate={onGenerate} embedded hideFab />
      </div>
    </>
  );
}
