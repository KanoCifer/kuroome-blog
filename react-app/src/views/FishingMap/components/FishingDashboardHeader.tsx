/**
 * Dashboard 顶部 sticky header。
 *
 * 替换原 FishingMapHeader + AIAnalysisWidget 里的 FAB：
 * - 标题 + kanocifer slug
 * - 右侧 AI 分析按钮（替代 FAB，统一浮层入口）
 * - 移动端只显 Bot 图标 + 红点；sm 及以上追加 "AI 分析" 文字
 */
import { Bot } from 'lucide-react';

interface FishingDashboardHeaderProps {
  analysisOpen: boolean;
  analysisHasData: boolean;
  onToggleAnalysis: () => void;
}

export function FishingDashboardHeader({
  analysisOpen,
  analysisHasData,
  onToggleAnalysis,
}: FishingDashboardHeaderProps) {
  return (
    <header className="border-border/40 bg-card/80 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 sm:px-5">
        <div className="ml-12 flex items-baseline gap-3">
          <h1 className="text-foreground font-family-dongfang text-lg font-semibold sm:text-xl">
            钓鱼地图
          </h1>
          <span className="text-muted-foreground hidden text-[10px] tracking-[0.25em] uppercase sm:inline">
            kanocifer
          </span>
        </div>

        <button
          type="button"
          aria-pressed={analysisOpen}
          aria-label={analysisOpen ? '关闭 AI 分析' : '打开 AI 分析'}
          onClick={onToggleAnalysis}
          className={`border-border bg-card/80 hover:bg-accent text-foreground inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2.5 text-sm backdrop-blur-sm transition-colors ${
            analysisOpen ? 'border-primary text-primary bg-primary/10' : ''
          }`}
        >
          <span className="relative inline-flex">
            <Bot className="h-4 w-4" aria-hidden="true" />
            {analysisHasData && !analysisOpen && (
              <span className="bg-success ring-card absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full ring-2" />
            )}
          </span>
          <span>AI 分析</span>
        </button>
      </div>
    </header>
  );
}
