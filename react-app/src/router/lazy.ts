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
export const Website = lazy(() => import('../views/Website/WebsiteView'));
export const BlogList = lazy(() => import('../views/Blog/BlogListView'));
export const BlogPost = lazy(() => import('../views/Blog/BlogPostView'));
export const RssWorkspace = lazy(() => import('../views/Rss/RssWorkspaceView'));
export const RssArticle = lazy(() => import('../views/Rss/RssArticleView'));
export const TodoList = lazy(() => import('../views/Todo/TodoListView'));
export const BlogEdit = lazy(() => import('../views/Blog/BlogEditView'));
