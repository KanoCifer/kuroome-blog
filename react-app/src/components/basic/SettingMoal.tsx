import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sun, Moon, Monitor, Check, X } from 'lucide-react';
import {
  useThemeState,
  type ColorScheme,
  type Theme,
} from '@/stores/themeState';
import { useShallow } from 'zustand/shallow';

const COLOR_SCHEMES: {
  value: ColorScheme;
  label: string;
  colors: string[];
}[] = [
  {
    value: 'sky-blue',
    label: 'Sky Blue',
    colors: ['#3b82f6', '#0ea5e9', '#6366f1'],
  },
  {
    value: 'forest-green',
    label: 'Forest Green',
    colors: ['#16a34a', '#0d9488', '#65a30d'],
  },
  { value: 'paper', label: 'Paper', colors: ['#c8713a', '#5a7a62', '#8a653f'] },
  { value: 'sage', label: 'Sage', colors: ['#4d6f57', '#8b7146', '#5e7072'] },
  { value: 'mist', label: 'Mist', colors: ['#4f687a', '#5d7569', '#927255'] },
  { value: 'blush', label: 'Blush', colors: ['#a5656f', '#6a7866', '#a06d4f'] },
  {
    value: 'spring',
    label: '春暖 (Spring)',
    colors: ['#35bfab', '#f59e0b', '#10b981'],
  },
  {
    value: 'autumn',
    label: '秋实 (Autumn)',
    colors: ['#de4331', '#eab308', '#3b82f6'],
  },
  {
    value: 'clear-sky',
    label: '晴空 (Clear Sky)',
    colors: ['#2fcbe7', '#eab308', '#ffffff'],
  },
  { value: 'midnight', label: '深夜 (Midnight)', colors: ['#2a48f3'] },
];

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '系统', Icon: Monitor },
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
];

export function SettingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, font, scheme, setTheme, setFont, setScheme } = useThemeState(
    useShallow((s) => ({
      theme: s.theme,
      font: s.font,
      scheme: s.scheme,
      setTheme: s.setTheme,
      setFont: s.setFont,
      setScheme: s.setScheme,
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
            className="bg-card fixed top-0 left-0 z-9999 h-full w-full max-w-md rounded-l-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween' }}
          >
            {/* 头部 */}
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-foreground flex items-center gap-2 font-serif text-lg font-bold">
                <Settings className="text-primary h-5 w-5" />
                偏好设置
              </h3>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 内容 */}
            <div
              className="overflow-y-auto p-6"
              style={{ height: 'calc(100% - 73px)' }}
            >
              <div className="space-y-6">
                {/* 主题模式 */}
                <section>
                  <label className="text-muted-foreground mb-3 block text-sm font-medium">
                    主题模式
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {THEMES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`border-border hover:border-primary flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                          theme === value ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 字体 */}
                <section>
                  <label className="text-muted-foreground mb-3 block text-sm font-medium">
                    字体
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFont('default')}
                      className={`border-border hover:border-primary flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                        font === 'default' ? 'border-primary bg-muted' : ''
                      }`}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ fontFamily: 'PingFang SC, sans-serif' }}
                      >
                        默认字体
                      </span>
                      <span className="text-muted-foreground text-xs">
                        PingFang SC
                      </span>
                    </button>
                    <button
                      onClick={() => setFont('harmonyos')}
                      className={`border-border hover:border-primary flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                        font === 'harmonyos' ? 'border-primary bg-muted' : ''
                      }`}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{
                          fontFamily: 'HarmonyOS Sans, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        HarmonyOS Sans
                      </span>
                      <span
                        className="text-muted-foreground text-xs"
                        style={{ fontFamily: 'HarmonyOS Sans, sans-serif' }}
                      >
                        鸿蒙字体
                      </span>
                    </button>
                  </div>
                </section>

                {/* 配色方案 */}
                <section>
                  <label className="text-muted-foreground mb-3 block text-sm font-medium">
                    配色方案
                  </label>
                  <div className="space-y-2">
                    {COLOR_SCHEMES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScheme(s.value)}
                        className={`border-border hover:border-primary flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                          scheme === s.value
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <div className="flex gap-1">
                          {s.colors.map((color, i) => (
                            <span
                              key={i}
                              className="h-5 w-5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{s.label}</span>
                        {scheme === s.value && (
                          <Check className="text-primary ml-auto h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
