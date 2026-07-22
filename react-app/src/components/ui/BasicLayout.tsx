import { BentoNavSidebar } from '@/components/ui/BasicSidebar';
import { TrackEvent } from '@/lib/visitorTracker';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { BackToTop } from './BackToTop';
import { BasicNav } from './BasicNav';
import { CookieConsent } from './CookieConsent';
import { NavVisibilityProvider } from './NavVisibilityContext';
import { Notifier } from './NotificationContainer';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function BasicLayout() {
  return (
    <NavVisibilityProvider>
      <TrackEvent />
      <BentoNavSidebar />
      <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto]">
        <header>
          <BasicNav />
        </header>
        <ScrollToTop />
        <main className="relative max-w-dvw scroll-smooth">
          <Outlet />
        </main>
        <BackToTop className="fixed right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))]" />
      </div>

      <CookieConsent />
      {createPortal(<Notifier />, document.body)}
    </NavVisibilityProvider>
  );
}
