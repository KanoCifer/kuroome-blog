import { lazy } from 'react';

export const Home = lazy(() => import('../views/Home/Home'));
export const Login = lazy(() => import('../views/Auth/Login'));
export const Register = lazy(() => import('../views/Auth/Register'));
export const ProfileSetting = lazy(
  () => import('../views/Auth/ProfileSettingView'),
);
export const FishingMap = lazy(() => import('../views/FishingMap/FishingMap'));
export const NotFound = lazy(() => import('../views/NotFound/NotFound'));
export const About = lazy(() => import('../views/general/AboutView'));
export const Changelog = lazy(() => import('../views/general/ChangelogView'));
export const Website = lazy(() => import('../views/Website/WebsiteView'));
export const BlogList = lazy(() => import('../views/Blog/BlogListView'));
export const BlogPost = lazy(() => import('../views/Blog/BlogPostView'));
export const RssWorkspace = lazy(() => import('../views/Rss/RssWorkspaceView'));
export const RssArticle = lazy(() => import('../views/Rss/RssArticleView'));
export const TodoList = lazy(() => import('../views/Todo/TodoListView'));
export const BlogEdit = lazy(() => import('../views/Blog/BlogEditView'));
export const ReadingList = lazy(
  () => import('../views/ReadingList/ReadingListView'),
);
export const BookShelf = lazy(() => import('../views/Book/BookShelfView'));
export const ImportBook = lazy(() => import('../views/Book/ImportBookView'));
export const PicGallery = lazy(() => import('../views/Pic/PicGalleryView'));
export const ImageToolbox = lazy(
  () => import('../views/Toolbox/ImageToolboxView'),
);
