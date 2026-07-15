import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Monitor, Sun, X } from 'lucide-react';
import {
  useThemeState,
  type ColorScheme,
  type Theme,
} from '@/stores/themeState';
import { useShallow } from 'zustand/shallow';
import { playThemeTransition } from '@/utils/themeTransition';
import { useMemo, useState } from 'react';

/* ───────────────────────── static data ───────────────────────── */

const COLOR_SCHEMES: {
  value: ColorScheme;
  label: string;
  colors: string[];
  desc: string;
}[] = [
  { value: 'paper', label: 'Paper · 纸', colors: ['#a87649', '#7a8e6b', '#5a6b7a'], desc: '落纸烟云 · 3 色' },
  { value: 'sage', label: 'Sage', colors: ['#6e8d6e', '#a89968', '#7d8a9b'], desc: '清隽素雅 · 3 色' },
  { value: 'mist', label: 'Mist', colors: ['#6c8aa4', '#7d9d8a', '#b09878'], desc: '烟岚氤氲 · 3 色' },
  { value: 'blush', label: 'Blush', colors: ['#a87180', '##7d9080', '#8a7474'], desc: '桃夭未央 · 3 色' },
];

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
];

/* 本地临时存储 key 与默认值 — 与 vue 端 useCardImage 对齐 */
const CARD_KEY = 'card-image-index';
const CARD_IMAGES = Array.from({ length: 3 }, (_, i) => `/card/card-${i + 1}-thumb.jpeg`);
const readCardIndex = () => {
  const n = Number(localStorage.getItem(CARD_KEY));
  return Number.isFinite(n) && n >= 0 && n < CARD_IMAGES.length ? n : 0;
};

/* ───────────────────────── spring constants ───────────────────────── */
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 32, mass: 0.8 };

/* ───────────────────────── helpers ───────────────────────── */

/** 0-100 百分比，驱动滑块渐变填充 */
const pct = (val: number, min: number, max: number) => ((val - min) / (max - min)) * 100;

const DRAWER_SHADOW = [
  '0 1px 1px color-mix(in oklch, var(--ink) 6%, transparent)',
  '0 8px 18px color-mix(in oklch, var(--ink) 8%, transparent)',
  '0 24px 40px color-mix(in oklch, var(--ink) 5%, transparent)',
  'inset 0 -1px 0 0 oklch(from var(--paper) l c h / 0.6)',
].join(', ');

/* ───────────────────────── component ───────────────────────── */

type Tab = 'appearance' | 'background' | 'card';
const TABS: { key: Tab; label: string }[] = [
  { key: 'appearance', label: '外观' },
  { key: 'background', label: '背景' },
  { key: 'card', label: '卡片' },
];

export function SettingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('appearance');

  const {
    theme, font, scheme, showFooter,
    bgBlur, bgBrightness, bgScale,
    setTheme, setFont, setScheme, toggleFooter,
    setBgBlur, setBgBrightness, setBgScale, resetBackground,
  } = useThemeState(useShallow(s => ({
    theme: s.theme, font: s.font, scheme: s.scheme, showFooter: s.showFooter,
    bgBlur: s.bgBlur, bgBrightness: s.bgBrightness, bgScale: s.bgScale,
    setTheme: s.setTheme, setFont: s.setFont, setScheme: s.setScheme, toggleFooter: s.toggleFooter,
    setBgBlur: s.setBgBlur, setBgBrightness: s.setBgBrightness, setBgScale: s.setBgScale,
    resetBackground: s.resetBackground,
  })));

  const [cardIdx, setCardIdx] = useState(readCardIndex);
  const setCard = (i: number) => { setCardIdx(i); localStorage.setItem(CARD_KEY, String(i)); };

  /* 滑块填充渐变 — 跟随主题 via color-mix */
  const blurFill = useMemo(() => {
    const v = pct(bgBlur, 5, 70);
    return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${v}%, var(--warm-gray) ${v}%, var(--warm-gray) 100%)`;
  }, [bgBlur]);
  const brightnessFill = useMemo(() => {
    const v = pct(Math.round(bgBrightness * 100), 30, 100);
    return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${v}%, var(--warm-gray) ${v}%, var(--warm-gray) 100%)`;
  }, [bgBrightness]);
  const scaleFill = useMemo(() => {
    const v = pct(Math.round(bgScale * 100), 100, 130);
    return `linear-gradient(to right, var(--accent) 0%, var(--accent) ${v}%, var(--warm-gray) ${v}%, var(--warm-gray) 100%)`;
  }, [bgScale]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="bg-background/50 fixed inset-0 z-9999 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 抽屉 — 右侧书房化 */}
          <motion.div
            className="bg-background border-border/60 fixed inset-y-0 right-0 z-9999 mx-4 my-6 flex w-full max-w-[480px] flex-col overflow-hidden rounded-3xl border max-sm:mx-2 max-sm:my-4"
            style={{ boxShadow: DRAWER_SHADOW }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={SPRING}
          >
            {/* 标题区 */}
            <header className="relative px-8 pt-12 pb-5 text-center">
              <button
                onClick={onClose}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-[0.96]"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>

              <h1 className="text-foreground font-serif text-[28px] leading-tight font-semibold">偏好设置</h1>
              <p className="text-muted-foreground mt-1.5 font-serif text-sm italic">Customize your reading experience</p>

              {/* 书签式装饰：两侧色点 + 中间梯度短横 */}
              <div className="mt-5 flex items-center gap-2 px-16">
                <span className="bg-primary/70 h-1 w-1 rounded-full" />
                <span className="from-gradient-decorative-from to-gradient-decorative-to h-px flex-1 bg-gradient-to-r" />
                <span className="bg-primary/70 h-1 w-1 rounded-full" />
              </div>
            </header>

            {/* 横向胶囊分段 Tab */}
            <nav aria-label="设置分组" className="mx-8 flex items-stretch justify-between gap-1 rounded-xl bg-muted p-1">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] ${
                    tab === t.key
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-[color-mix(in_oklch,var(--ink)_55%,transparent)] hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {/* 内容区 — Tab 切换用淡入淡出 */}
            <div className="flex-1 overflow-y-auto px-8 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  {tab === 'appearance' && (
                    <div className="space-y-6">
                      {/* 页面元素 */}
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">页面元素</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Display the page footer</p>
                        <button
                          onClick={toggleFooter}
                          className="border-border hover:border-primary bg-background flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors"
                        >
                          <div className="text-left">
                            <div className="text-foreground text-sm font-medium">显示页脚</div>
                            <div className="text-muted-foreground mt-0.5 text-xs">Show footer on every page</div>
                          </div>
                          <div className={`h-6 w-11 rounded-full p-0.5 transition-colors ${showFooter ? 'bg-primary' : 'bg-muted'}`}>
                            <div className={`bg-background h-5 w-5 rounded-full shadow-md transition-transform ${showFooter ? 'translate-x-5' : ''}`} />
                          </div>
                        </button>
                      </div>

                      {/* 主题模式 */}
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">主题模式</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Theme mode</p>
                        <div className="grid grid-cols-3 gap-3">
                          {THEMES.map(({ value, label, Icon }) => (
                            <button
                              key={value}
                              onClick={(e) => { setTheme(value); playThemeTransition(e as unknown as MouseEvent, value); }}
                              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                                theme === value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary bg-background'
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${theme === value ? 'text-primary' : 'text-foreground'}`} />
                              <span className={`text-xs ${theme === value ? 'font-semibold text-primary' : 'text-foreground'}`}>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 字体 */}
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">字体</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Reading font</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'default' as const, label: '默认字体', sub: 'PingFang SC' },
                            { value: 'harmonyos' as const, label: 'HarmonyOS Sans', sub: '鸿蒙字体' },
                          ].map(o => (
                            <button
                              key={o.value}
                              onClick={() => setFont(o.value)}
                              className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors ${
                                font === o.value ? 'border-primary bg-primary/5 !shadow-sm' : 'border-border bg-background hover:border-primary'
                              }`}
                            >
                              <span className={`text-sm font-semibold ${font === o.value ? 'text-primary' : 'text-foreground'}`}
                                style={o.value === 'harmonyos' ? { fontFamily: 'Noto Sans SC, sans-serif', fontWeight: 500 } : undefined}>
                                {o.label}
                              </span>
                              <span className="text-muted-foreground font-mono text-[10px]">{o.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 配色方案 */}
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">配色方案</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Color scheme · 四种调性</p>
                        <div className="space-y-2">
                          {COLOR_SCHEMES.map(s => (
                            <button
                              key={s.value}
                              onClick={() => setScheme(s.value)}
                              className={`flex w-full items-stretch overflow-hidden rounded-xl border transition-colors ${
                                scheme === s.value ? 'border-primary bg-primary/5 !shadow-sm' : 'border-border bg-background hover:border-primary'
                              }`}
                            >
                              <div className="flex w-[72px] flex-col">
                                {s.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
                              </div>
                              <div className="flex-1 px-4 py-3 text-left">
                                <div className="text-foreground text-sm font-semibold">{s.label}</div>
                                <div className="text-muted-foreground mt-0.5 text-[11px] italic">{s.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'background' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">背景调整</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Adjust background appearance</p>

                        <div className="rounded-xl border border-border/60 bg-background p-5">
                          <div className="space-y-5">
                            {/* 模糊 */}
                            <SliderRow
                              icon={<BlurIcon />}
                              label="背景模糊"
                              value={bgBlur}
                              unit="px"
                              min={5} max={70} step={1}
                              trackFill={blurFill}
                              onChange={setBgBlur}
                            />
                            {/* 亮度 */}
                            <SliderRow
                              icon={<Sun className="text-muted-foreground h-4 w-4" />}
                              label="背景亮度"
                              value={Math.round(bgBrightness * 100)}
                              unit="%"
                              min={30} max={100} step={5}
                              trackFill={brightnessFill}
                              onChange={v => setBgBrightness(v / 100)}
                            />
                            {/* 缩放 */}
                            <SliderRow
                              icon={<ScaleIcon />}
                              label="背景缩放"
                              value={Math.round(bgScale * 100)}
                              unit="%"
                              min={100} max={130} step={1}
                              trackFill={scaleFill}
                              onChange={v => setBgScale(v / 100)}
                            />
                          </div>

                          <button
                            onClick={resetBackground}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted mt-3 flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                            </svg>
                            重置为默认
                          </button>
                        </div>
                      </div>

                      {/* 背景模式选择（仍保留） */}
                      <BackgroundModeSelector />
                    </div>
                  )}

                  {tab === 'card' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-foreground font-serif text-lg font-semibold">卡片配图</h2>
                        <p className="text-muted-foreground mb-4 text-xs italic">Card cover image</p>

                        {/* 横版预览 */}
                        <div className="relative mx-auto aspect-[16/9] w-full max-w-xs overflow-hidden rounded-xl border border-border/60 shadow-sm">
                          <div
                            className="h-full w-full bg-cover bg-center transition-[background] duration-300"
                            style={{ backgroundImage: `url(${CARD_IMAGES[cardIdx]})` }}
                          />
                        </div>

                        {/* 三选一切换器 */}
                        <div className="mt-4 flex justify-center gap-3">
                          {CARD_IMAGES.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setCard(i)}
                              className={`aspect-[16/9] w-16 overflow-hidden rounded-lg border transition-all duration-200 ${
                                cardIdx === i
                                  ? 'border-primary !shadow-sm scale-105'
                                  : 'border-border/60 opacity-70 hover:opacity-100 hover:border-primary'
                              }`}
                              aria-label={`卡片 ${i + 1}`}
                              aria-pressed={cardIdx === i}
                            >
                              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${img})` }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 底部 — 品牌签名 + 居中渐变分隔线 */}
            <div className="-mb-px px-8 pt-3">
              <div className="via-border h-px w-1/3 bg-gradient-to-r from-transparent to-transparent" />
            </div>
            <footer className="flex items-center justify-between px-8 pt-2 pb-4 font-mono text-[11px]">
              <span className="text-muted-foreground font-sans">Settings · v4.7.0</span>
              <span className="text-muted-foreground font-serif italic">ka·no·ci·fer</span>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── SliderRow ───────────────────────── */

function SliderRow({ icon, label, value, unit, min, max, step, trackFill, onChange }: {
  icon: React.ReactNode; label: string; value: number; unit: string;
  min: number; max: number; step: number; trackFill: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">{icon}{label}</span>
        <span className="bg-muted text-foreground rounded-full px-2 py-0.5 font-mono text-xs font-medium tabular-nums">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="slider h-6 w-full cursor-pointer appearance-none bg-transparent"
        style={{ '--track-fill': trackFill } as React.CSSProperties}
      />
    </div>
  );
}

function BlurIcon() {
  return (
    <svg className="text-muted-foreground h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15 15 0 0 1 0 20" opacity="0.4" />
      <path d="M12 2a15 15 0 0 0 0 20" opacity="0.4" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg className="text-muted-foreground h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function BackgroundModeSelector() {
  // 简单占位 — randomize / fixed 切换
  return (
    <div>
      <h2 className="text-foreground font-serif text-lg font-semibold">背景模式</h2>
      <p className="text-muted-foreground mb-4 text-xs italic">Background mode</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'random', label: '随机切换' },
          { value: 'fixed', label: '固定背景' },
        ].map(o => (
          <button
            key={o.value}
            className="border-border bg-background hover:border-primary flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium text-foreground transition-colors"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
