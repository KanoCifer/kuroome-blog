import { BentoCalendar } from './components/BentoCalendar';
import { BentoClock } from './components/BentoClock';
import { BentoGreeting } from './components/BentoGreeting';
import { BentoMap } from './components/BentoMap';
import { BentoMemo } from './components/BentoMemo';
import { BentoNavSidebar } from './components/BentoNavSidebar';
import { BentoProfile } from './components/BentoProfile';
import { BentoReadingList } from './components/BentoReadingList';
import { BentoTech } from './components/BentoTech';
import { BentoTodo } from './components/BentoTodo';
import { BentoWeb } from './components/BentoWeb';

export default function Home() {
  return (
    <>
      <BentoNavSidebar />
      <div className="flex flex-col items-center justify-center relative min-h-screen">
        {/* Bento Grid */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-row flex-wrap content-start gap-4 overflow-x-hidden p-5 pt-24 pb-32">
          <div className="order-1 w-full min-w-0">
            <BentoProfile />
          </div>
          <div className="order-2 w-full min-w-0">
            <BentoGreeting />
          </div>
          <div className="order-3 w-[calc(50%-0.5rem)] min-w-0">
            <BentoClock />
          </div>
          <div className="order-4 w-[calc(50%-0.5rem)] min-w-0">
            <BentoMemo />
          </div>
          <div className="order-5 w-full min-w-0">
            <BentoCalendar />
          </div>
          <div className="order-6 w-full min-w-0">
            <BentoTech />
          </div>
          <div className="order-7 w-[calc(50%-0.5rem)] min-w-0">
            <BentoReadingList />
          </div>
          <div className="order-8 w-[calc(50%-0.5rem)] min-w-0">
            <BentoMap />
          </div>

          <div className="order-9 w-full min-w-0">
            <BentoTodo />
          </div>

          <div className="order-10 w-full min-w-0">
            <BentoWeb />
          </div>
        </div>
      </div>
    </>
  );
}
