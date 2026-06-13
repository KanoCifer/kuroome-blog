/**
 * AI 智能分析侧边抽屉。
 *
 * 替换原本右下角 FAB + popover 浮层组合：
 * - 桌面/移动统一从右侧滑入，移动端 max-w-[90vw]，桌面 420px
 * - 点击 backdrop 或 ✕ 关闭
 * - 与 Map 的路线浮层在视觉上彻底分离（一个底部、一个右侧）
 *
 * 内容区直接复用 AIAnalysisWidget 的「内嵌 + 无 FAB」模式（embedded + hideFab），
 * 这样状态、shimmer、model select、markdown 渲染都继续走 AnalysisContext。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
            className="bg-foreground/20 fixed inset-0 z-40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border-border fixed top-0 right-0 z-50 flex h-screen w-[420px] max-w-[90vw] flex-col border-l shadow-2xl"
            role="dialog"
            aria-label="AI 分析"
          >
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
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
              <AIAnalysisWidget onGenerate={onGenerate} embedded hideFab />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
