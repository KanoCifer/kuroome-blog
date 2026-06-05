import { BasicLayout } from '@/components/basic/BasicLayout';
import { Suspense } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import {
  About,
  Analytics,
  BlogList,
  BlogPost,
  Changelog,
  DeviceTracker,
  FishingMap,
  FriendLinks,
  Home,
  ImageToolbox,
  Login,
  NotFound,
  PicGallery,
  ProfileSetting,
  PrivacyPolicy,
  Register,
  RssArticle,
  RssWorkspace,
  Status,
  Subscription,
  TodoList,
  Website,
} from './lazy';

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

async function adminLoader() {
  const { useAuthStore } = await import('../stores/authState');
  const store = useAuthStore.getState();

  if (!store.isHydrated) {
    await store.hydrateAuth();
  }

  if (!store.user) {
    return redirect('/login?redirect=' + window.location.pathname);
  }

  if (!store.user.is_admin) {
    return redirect('/');
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
        element: <Home />,
      },

      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/settings',
        element: <ProfileSetting />,
        loader: authLoader,
      },
      {
        path: '/fishing-map',
        element: <FishingMap />,
      },
      {
        path: '/gallery',
        element: <PicGallery />,
      },
      {
        path: '/toolbox/image-toolbox',
        element: <ImageToolbox />,
      },
      {
        path: '/changelog',
        element: <Changelog />,
      },
      {
        path: '/about',
        element: <About />,
      },
      {
        path: '/privacy',
        element: <PrivacyPolicy />,
      },
      {
        path: '/websites',
        element: <Website />,
      },
      {
        path: '/friend-links',
        element: <FriendLinks />,
      },
      {
        path: '/status',
        element: <Status />,
      },
      {
        path: '/blog',
        element: <BlogList />,
      },
      {
        path: '/blog/:postId',
        element: <BlogPost />,
      },
      {
        path: '/rss',
        element: <RssWorkspace />,
        loader: authLoader,
      },
      {
        path: '/rss/articles/:articleId',
        element: <RssArticle />,
        loader: authLoader,
      },
      {
        path: '/todos',
        element: <TodoList />,
      },
      {
        path: '/analytics',
        element: <Analytics />,
        loader: adminLoader,
      },
      {
        path: '/subscription',
        element: <Subscription />,
        loader: authLoader,
      },
      {
        path: '/device-tracker',
        element: <DeviceTracker />,
        loader: authLoader,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
