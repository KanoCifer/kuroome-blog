import { BentoCard } from '@/components/bento/BentoCard';
import { useEffect, useState } from 'react';
import { MemoIcon } from './icon/MemoIcon';

const memoKey = 'bento-memo';

export function BentoMemo() {
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState(localStorage.getItem(memoKey) || '');

  useEffect(() => {
    localStorage.setItem(memoKey, memoText);
  }, [memoText]);

  const toggleMemo = () => {
    setIsMemoOpen(!isMemoOpen);
  };

  const closeMemo = () => {
    setIsMemoOpen(false);
  };

  const clearMemo = () => {
    setMemoText('');
    localStorage.removeItem(memoKey);
  };

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMemoOpen) {
        closeMemo();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isMemoOpen]);

  return (
    <>
      <div onClick={toggleMemo} className="h-full cursor-pointer">
        <BentoCard className="h-full">
          <div className="bg-warning/20 flex h-10 w-10 items-center justify-center rounded-lg">
            <MemoIcon className="text-warning size-6" />
          </div>
          <div>
            <h5 className="text-foreground text-sm font-bold">Quick Memo</h5>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-tight">
              {memoText ? memoText : 'Tap to write down your thoughts...'}
            </p>
          </div>
        </BentoCard>
      </div>

      {isMemoOpen && (
        <>
          <div
            onClick={closeMemo}
            className="bg-foreground/30 fixed inset-0 z-50 backdrop-blur-[2px]"
            style={{ animation: 'memo-fade-in 0.2s ease-out' }}
          />
          <div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
            style={{ animation: 'memo-pop-in 0.2s ease-out' }}
          >
            <div
              className="bg-background pointer-events-auto relative z-10 w-11/12 max-w-lg transform-gpu rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeMemo}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h3 className="text-foreground mb-4 flex items-center gap-2 font-serif text-xl font-bold">
                <MemoIcon className="size-5" />
                Quick Memo
              </h3>

              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="在这里写下你的想法..."
                className="border-border bg-muted text-card-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary/20 mb-4 w-full resize-none rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                rows={10}
                autoFocus
              />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  自动保存
                  {memoText && (
                    <span className="ml-2">{memoText.length} 字</span>
                  )}
                </span>
                <button
                  onClick={clearMemo}
                  className="border-border bg-muted text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  清空
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
