import { lazy } from 'react';

export const Home = lazy(() => import('../features/home/Home'));
export const Login = lazy(() => import('../features/auth/Login'));
export const Register = lazy(() => import('../features/auth/Register'));
export const ProfileSetting = lazy(
  () => import('../features/auth/ProfileSettingView'),
);
export const FishingMap = lazy(() => import('../features/fishing/FishingMap'));
export const NotFound = lazy(() => import('../features/pages/not-found/NotFound'));
export const About = lazy(() => import('../features/pages/about/AboutView'));
export const Changelog = lazy(() => import('../features/pages/changelog/ChangelogView'));
export const Website = lazy(() => import('../features/pages/websites/WebsiteView'));
export const BlogList = lazy(() => import('../features/blog/BlogListView'));
export const BlogPost = lazy(() => import('../features/blog/BlogPostView'));
export const MomentList = lazy(() => import('../features/moments/MomentListView'));
export const RssWorkspace = lazy(() => import('../features/rss/RssWorkspaceView'));
export const RssArticle = lazy(() => import('../features/rss/RssArticleView'));
export const TodoList = lazy(() => import('../features/todo/TodoListView'));
export const PicGallery = lazy(() => import('../features/pic/PicGalleryView'));
export const PrivacyPolicy = lazy(
  () => import('../features/pages/privacy/PrivacyPolicyView'),
);
export const FriendLinks = lazy(() => import('../features/pages/friend-links/FriendLinksView'));
export const BookShelf = lazy(() => import('../features/books/BookShelf'));
export const BookStats = lazy(() => import('../features/books/components/BookStats'));
