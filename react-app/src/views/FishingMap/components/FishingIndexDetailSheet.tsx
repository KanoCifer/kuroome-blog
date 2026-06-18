import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

import type { FishingIndexData } from '../types';

interface Props {
  open: boolean;
  data: FishingIndexData | null;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  w1_temp: '气温',
  w2_humidity: '湿度',
  w3_pressure: '气压',
  w4_wind: '风速',
  w5_rain: '降水',
  w6_tide_rising: '涨潮',
  w7_hours_to_tide: '距潮',
  w8_tide_range: '潮差',
  w9_indices: '指数',
};

function gaugeColor(p: number): string {
  if (p >= 85) return '#22c55e';
  if (p >= 70) return '#06b6d4';
  if (p >= 50) return '#f97316';
  if (p <= 30) return '#ef4444';
  return '#3b82f6';
}

export function FishingIndexDetailSheet({ open, data, onClose }: Props) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && data && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="bg-foreground/30 fixed inset-0 z-40 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.aside
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card border-border fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] max-h-[88dvh] flex-col rounded-t-2xl border-t shadow-2xl"
            role="dialog"
            aria-label="特征详情"
          >
            <div className="flex flex-col gap-3 overflow-y-auto p-5 pb-8">
              <div className="bg-muted-foreground/40 mx-auto h-1 w-9 rounded-full" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-lg font-semibold">
                    特征详情
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    9 项子特征 · 综合指数 {data.fishing_index} · {data.level}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="hover:bg-muted text-muted-foreground inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {Object.entries(data.feature_breakdown).map(
                  ([key, value]: [string, number]) => {
                    const vals = Object.values(data.feature_breakdown);
                    const max = vals.length ? Math.max(...vals) : 0;
                    const pct = max > 0 ? (value / max) * 100 : 50;
                    const color = gaugeColor(pct);
                    const label = LABELS[key] || key;
                    return (
                      <div
                        key={key}
                        className="border-border/40 bg-secondary/40 rounded-2xl border p-3"
                      >
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-muted-foreground text-xs font-medium">
                            {label}
                          </span>
                          <span className="text-foreground text-sm font-semibold tabular-nums">
                            {value}
                          </span>
                        </div>
                        <div className="bg-card relative h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}cc, ${color})`,
                              boxShadow: `0 0 6px ${color}55`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
