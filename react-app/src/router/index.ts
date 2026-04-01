import { createBrowserRouter, redirect } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import BasicLayout from '../components/BasicLayout';


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
    element: <BasicLayout />,
    loader: authLoader,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
]);
  }