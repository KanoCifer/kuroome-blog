import { BasicLayout } from '@/components/basic/BasicLayout';
import { Suspense } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import { Home, Login, FishingMap } from './lazy';

// 认证守卫 loader
async function authLoader() {
  const { useAuthStore } = await import('../stores/authState');
  const store = useAuthStore.getState();

  if (!store.isHydrated) {
    await store.hydrateAuth();
  }

  if (!store.user) {
    return redirect('/login?redirect=' + window.location.pathname);
  }
  return null;
}

export const router = createBrowserRouter([
  {
    element: (
      <Suspense>
        <BasicLayout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense>
            <Home />
          </Suspense>
        ),
      },

      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/fishing-map',
        element: (
          <Suspense>
            <FishingMap />
          </Suspense>
        ),
      },
    ],
  },
]);
