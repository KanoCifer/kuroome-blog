import { useNavVisibility } from '@/components/basic/NavVisibilityContext';
import { useEffect } from 'react';
import { BentoCalendar } from './components/BentoCalendar';
import { BentoClock } from './components/BentoClock';
import { BentoHero } from './components/BentoHero';
import { BentoMap } from './components/BentoMap';
import { BentoMemo } from './components/BentoMemo';
import { BentoTech } from './components/BentoTech';
import { BentoTodo } from './components/BentoTodo';
import { BentoWeb } from './components/BentoWeb';

export default function Home() {
  const { showNav } = useNavVisibility();

  useEffect(() => {
    showNav();
    return () => showNav();
  }, [showNav]);

  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center">
      {/* Bento Grid — 6 列密集分栏，纯 CSS 动画。
          内边距走 env(safe-area-inset-*)，适配 iPhone 刘海 / 灵动岛 / Home Indicator。
          依赖 index.html 中 viewport-fit=cover，否则 env() 在 iOS 上恒为 0。
          卡片圆角按宽度分级：hero/全宽最大，半宽收敛，视觉更精致。 */}
      <div
        className="bento-grid relative mx-auto grid min-h-dvh w-full max-w-md grid-cols-6 gap-3 overflow-x-hidden pl-[max(1.25rem,env(safe-area-inset-left,1.25rem))] pr-[max(1.25rem,env(safe-area-inset-right,1.25rem))] pb-[calc(env(safe-area-inset-bottom,0px)+8rem)] pt-[calc(env(safe-area-inset-top,0px)+3rem)]"
      >
        {/* Hero — Profile + Greeting 合并，视觉锚点 */}
        <div
          className="bento-delay-1 col-span-6 min-w-0"
          style={{ ['--bento-radius' as string]: '2.5rem' }}
        >
          <BentoHero />
        </div>

        {/* 时间 + 速记 两栏 */}
        <div
          className="bento-delay-2 col-span-3 min-w-0"
          style={{ ['--bento-radius' as string]: '1.75rem' }}
        >
          <BentoClock />
        </div>
        <div
          className="bento-delay-3 col-span-3 min-w-0"
          style={{ ['--bento-radius' as string]: '1.75rem' }}
        >
          <BentoMemo />
        </div>

        {/* 开发任务 — 主功能区 */}
        <div
          className="bento-delay-4 col-span-6 min-w-0"
          style={{ ['--bento-radius' as string]: '2rem' }}
        >
          <BentoTodo />
        </div>

        {/* 日历 */}
        <div
          className="bento-delay-5 col-span-6 min-w-0"
          style={{ ['--bento-radius' as string]: '2rem' }}
        >
          <BentoCalendar />
        </div>

        {/* 钓点 + 每日精选 两栏 */}
        <div
          className="bento-delay-6 col-span-3 min-w-0"
          style={{ ['--bento-radius' as string]: '1.75rem' }}
        >
          <BentoMap />
        </div>
        <div
          className="bento-delay-7 col-span-3 min-w-0"
          style={{ ['--bento-radius' as string]: '1.75rem' }}
        >
          <BentoWeb />
        </div>

        {/* 技术栈 */}
        <div
          className="bento-delay-8 col-span-6 min-w-0"
          style={{ ['--bento-radius' as string]: '2rem' }}
        >
          <BentoTech />
        </div>
      </div>
    </div>
  );
}
