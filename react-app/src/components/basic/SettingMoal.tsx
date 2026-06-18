import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, X } from 'lucide-react';
import {
  useThemeState,
  type ColorScheme,
  type Theme,
} from '@/stores/themeState';
import { useShallow } from 'zustand/shallow';
import { playThemeTransition } from '@/utils/themeTransition';

const COLOR_SCHEMES: {
  value: ColorScheme;
  label: string;
  colors: string[];
  desc: string;
}[] = [
  {
    value: 'sky-blue',
    label: 'Sky Blue',
    colors: ['#3b82f6', '#0ea5e9', '#6366f1'],
    desc: '高远澄澈 · 3 色',
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    colors: ['#16a34a', '#0d9488', '#65a30d'],
    desc: '林深时见 · 3 色',
  },
  {
    value: 'paper',
    label: 'Paper · 纸',
    colors: ['#c8713a', '#5a7a62', '#8a653f'],
    desc: '落纸烟云 · 3 色',
  },
  {
    value: 'sage',
    label: 'Sage',
    colors: ['#4d6f57', '#8b7146', '#5e7072'],
    desc: '清隽素雅 · 3 色',
  },
  {
    value: 'mist',
    label: 'Mist',
    colors: ['#4f687a', '#5d7569', '#927255'],
    desc: '烟岚氤氲 · 3 色',
  },
  {
    value: 'blush',
    label: 'Blush',
    colors: ['#a5656f', '#6a7866', '#a06d4f'],
    desc: '桃夭未央 · 3 色',
  },
  {
    value: 'spring',
    label: '春暖 Spring',
    colors: ['#35bfab', '#f59e0b', '#10b981'],
    desc: '万物生发 · 3 色',
  },
  {
    value: 'autumn',
    label: '秋实 Autumn',
    colors: ['#de4331', '#eab308', '#3b82f6'],
    desc: '橙黄橘绿 · 3 色',
  },
  {
    value: 'clear-sky',
    label: '晴空 Clear Sky',
    colors: ['#2fcbe7', '#eab308', '#ffffff'],
    desc: '万里无云 · 3 色',
  },
  {
    value: 'midnight',
    label: '深夜 Midnight',
    colors: ['#2a48f3'],
    desc: '独坐幽篁 · 1 色',
  },
];

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
];

// 壹貳叁肆 — 财务大写数字，营造章节感
const SECTION_NUMERALS = ['壹', '貳', '叁', '肆'];

export function SettingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    theme,
    font,
    scheme,
    showFooter,
    setTheme,
    setFont,
    setScheme,
    toggleFooter,
  } = useThemeState(
    useShallow((s) => ({
      theme: s.theme,
      font: s.font,
      scheme: s.scheme,
      showFooter: s.showFooter,
      setTheme: s.setTheme,
      setFont: s.setFont,
      setScheme: s.setScheme,
      toggleFooter: s.toggleFooter,
    })),
  );

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

          {/* 抽屉 */}
          <motion.div
            className="bg-card fixed top-0 left-0 z-9999 flex h-full w-full max-w-md flex-col transition-colors duration-300"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween' }}
          >
            {/* 装帧书脊 */}
            <div className="bg-primary absolute top-0 right-0 bottom-0 w-[3px]" />

            {/* 标题区 */}
            <header className="relative px-8 pt-10 pb-6 text-center">
              <button
                onClick={onClose}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-muted-foreground mb-3 font-mono text-[10px] tracking-[0.4em] uppercase">
                Chapter
              </div>

              <h1 className="text-foreground font-serif text-[28px] leading-tight font-semibold">
                偏好设置
              </h1>

              <p className="text-muted-foreground mt-2 font-serif text-sm italic">
                Customize your reading experience
              </p>

              <div className="bg-primary mx-auto mt-6 h-px w-12" />
            </header>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                {/* 页面元素 */}
                <section>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-muted-foreground font-serif text-[11px] tracking-[0.2em]">
                      {SECTION_NUMERALS[0]}
                    </span>
                    <h2 className="text-foreground font-serif text-lg font-semibold">
                      页面元素
                    </h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs italic">
                    Display the page footer
                  </p>

                  <div
                    onClick={toggleFooter}
                    className="border-border bg-card hover:border-primary flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors"
                  >
                    <div>
                      <div className="text-foreground text-sm font-medium">
                        显示页脚
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Show footer on every page
                      </div>
                    </div>
                    <div
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                        showFooter ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`bg-card h-5 w-5 rounded-full shadow-md transition-transform ${
                          showFooter ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </section>

                {/* 主题模式 */}
                <section>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-muted-foreground font-serif text-[11px] tracking-[0.2em]">
                      {SECTION_NUMERALS[1]}
                    </span>
                    <h2 className="text-foreground font-serif text-lg font-semibold">
                      主题模式
                    </h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs italic">
                    Theme mode
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {THEMES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={(e) => {
                          setTheme(value);
                          playThemeTransition(e, value);
                        }}
                        className={`flex flex-col items-center gap-2 rounded-md border-2 p-3 transition-colors ${
                          theme === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            theme === value ? 'text-primary' : 'text-foreground'
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            theme === value
                              ? 'text-primary font-semibold'
                              : 'text-foreground'
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 字体 */}
                <section>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-muted-foreground font-serif text-[11px] tracking-[0.2em]">
                      {SECTION_NUMERALS[2]}
                    </span>
                    <h2 className="text-foreground font-serif text-lg font-semibold">
                      字体
                    </h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs italic">
                    Reading font
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFont('default')}
                      className={`flex flex-col items-center gap-1 rounded-md border-2 p-3 transition-colors ${
                        font === 'default'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary'
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          font === 'default'
                            ? 'text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        默认字体
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        PingFang SC
                      </span>
                    </button>
                    <button
                      onClick={() => setFont('harmonyos')}
                      className={`flex flex-col items-center gap-1 rounded-md border-2 p-3 transition-colors ${
                        font === 'harmonyos'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary'
                      }`}
                    >
                      <span
                        className="text-foreground text-sm font-semibold"
                        style={{
                          fontFamily: 'Noto Sans SC, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        HarmonyOS Sans
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        鸿蒙字体
                      </span>
                    </button>
                  </div>
                </section>

                {/* 配色方案 */}
                <section>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-muted-foreground font-serif text-[11px] tracking-[0.2em]">
                      {SECTION_NUMERALS[3]}
                    </span>
                    <h2 className="text-foreground font-serif text-lg font-semibold">
                      配色方案
                    </h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs italic">
                    Color scheme · 十种调性
                  </p>

                  <div className="space-y-2.5">
                    {COLOR_SCHEMES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScheme(s.value)}
                        className={`flex w-full items-stretch overflow-hidden rounded-md border-2 transition-colors ${
                          scheme === s.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary'
                        }`}
                      >
                        {s.colors.length > 1 ? (
                          <div className="flex w-[72px] flex-col">
                            {s.colors.map((color, i) => (
                              <div
                                key={i}
                                className="flex-1"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div
                            className="w-[72px]"
                            style={{
                              background: `linear-gradient(180deg, ${s.colors[0]} 0%, ${s.colors[0]}cc 100%)`,
                            }}
                          />
                        )}
                        <div className="flex-1 px-4 py-3 text-left">
                          <div className="text-foreground text-sm font-semibold">
                            {s.label}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[11px] italic">
                            {s.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* 底部 */}
            <footer className="text-muted-foreground border-border flex items-center justify-between border-t px-8 py-3 font-mono text-[11px]">
              <span>Settings · v3.1</span>
              <span className="font-serif italic">ka·no·ci·fer</span>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
