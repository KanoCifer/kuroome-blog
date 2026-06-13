/**
 * Quick feedback banner —— "钓完了？告诉我们今天实际如何"。
 *
 * 放在 dashboard 顶部（Map / Index 之上），没有 routeInfo 时显示。
 * 不再用 warning 色调，改成 muted + 主按钮，跟 dashboard 网格协调。
 */
import { motion } from 'framer-motion';

interface QuickFeedbackBannerProps {
  visible: boolean;
  disabled?: boolean;
  onSubmit: () => void;
}

export function QuickFeedbackBanner({
  visible,
  disabled = false,
  onSubmit,
}: QuickFeedbackBannerProps) {
  if (!visible) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="border-border/70 bg-muted/30 flex flex-col items-start gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground font-family-averia text-sm italic sm:text-base">
          钓完了？告诉我们今天实际如何
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          三个问题，三十秒 —— 您的反馈会帮系统下次更准
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground min-h-11 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed"
      >
        反馈今日指数
      </button>
    </motion.section>
  );
}
