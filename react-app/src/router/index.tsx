import { BasicLayout } from '@/components/basic/BasicLayout';
import { Suspense } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import {
  About,
  Changelog,
  BlogEdit,
  BlogList,
  BlogPost,
  BookShelf,
  FishingMap,
  Home,
  ImageToolbox,
  ImportBook,
  Login,
  NotFound,
  PicGallery,
  ProfileSetting,
  ReadingList,
  Register,
  RssArticle,
  RssWorkspace,
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
        path: '/websites',
        element: <Website />,
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
        path: '/new',
        element: <BlogEdit />,
        loader: authLoader,
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
        path: '/readinglist',
        element: <ReadingList />,
        loader: authLoader,
      },
      {
        path: '/bookshelf',
        element: <BookShelf />,
        loader: authLoader,
      },
      {
        path: '/import',
        element: <ImportBook />,
        loader: authLoader,
      },
      {
        path: '/todos',
        element: <TodoList />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
