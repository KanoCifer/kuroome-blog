import { BentoNavSidebar } from '@/components/basic/BasicSidebar';
import { TrackEvent } from '@/utils/visitorTracker';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet } from 'react-router-dom';
import { BackToTop } from './BackToTop';
import { BasicNav } from './BasicNav';
import { NavVisibilityProvider } from './NavVisibilityContext';
import { Notifier } from './NotificationContainer';

export function BasicLayout() {
  const backgroundImages = [
    '/background/bg-1.webp',
    '/background/bg-2.webp',
    '/background/bg-3.webp',
    '/background/bg-4.webp',
    '/background/bg-5.webp',
    '/background/bg-6.webp',
    '/background/bg-7.webp',
    '/background/bg-8.webp',
    '/background/bg-9.webp',
    '/background/bg-10.webp',
  ];
  const [backgroundUrl] = useState<string>(
    () => backgroundImages[Math.floor(Math.random() * backgroundImages.length)],
  );

  return (
    <NavVisibilityProvider>
      <TrackEvent />
      <BentoNavSidebar />
      <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
        <div
          style={{ backgroundImage: `url(${backgroundUrl})` }}
          className="pointer-events-none fixed inset-0 -z-10 transform-gpu bg-cover bg-fixed blur-md transition-all duration-800"
        />
        <header>
          <BasicNav />
        </header>
        <main className="relative max-w-dvw scroll-smooth">
          <Outlet />
        </main>
        <BackToTop className="fixed right-4 bottom-30" />
      </div>

      {createPortal(<Notifier />, document.body)}
    </NavVisibilityProvider>
  );
}
