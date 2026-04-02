import {
  BarChart,
  BookOpen,
  FileUp,
  History,
  Home,
  Image as ImageIcon,
  Info,
  LogIn,
  LogOut,
  MessageSquare,
  Rss,
  User,
  UserPlus,
  Wrench,
} from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const useAuthStore = () => ({
  isAuthenticated: false,
  loading: false,
  user: {
    name: 'User',
    photo: '',
    is_admin: true,
  },
  logout: () => console.log('Logout'),
});

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/blog', label: '近期文章', icon: BookOpen },
  { path: '/bookshelf', label: '我的书架', icon: BookOpen },
  { path: '/gallery', label: '图片画廊', icon: ImageIcon },
  { path: '/changelog', label: '更新日志', icon: History },
  { path: '/rss', label: 'RSS 订阅', icon: Rss },
  { path: '/toolbox/image-toolbox', label: '图片工具', icon: Wrench },
  { path: '/about', label: '关于网站', icon: Info },
];

export const SidebarContent: React.FC = () => {
  const auth = useAuthStore();
  const location = useLocation();

  const currentUserName = auth.isAuthenticated
    ? auth.user?.name || '用户'
    : '游客';
  const avatarUrl =
    auth.isAuthenticated && auth.user?.photo
      ? auth.user.photo.startsWith('http')
        ? auth.user.photo
        : `/api/v1/media/${auth.user.photo}`
      : '/images/about.webp';

  return (
    <ul className="menu bg-base-200 min-h-full w-80 p-4">
      {/* 用户信息区 */}
      <li>
        <div className="flex items-center gap-4 px-2 py-4">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={avatarUrl} alt={currentUserName} />
            </div>
          </div>
          <span className="font-bold">{currentUserName}</span>
        </div>
      </li>

      <li className="menu-title">
        <span>GENERAL</span>
      </li>

      {/* 导航项列表 */}
      {navItems.map((item) => (
        <li key={item.path}>
          <Link
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        </li>
      ))}

      <li className="menu-title">
        <span>Account</span>
      </li>

      {/* 用户菜单 */}
      {auth.isAuthenticated ? (
        <>
          <li>
            <Link to="/settings">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </li>
          <li>
            <Link to="/import">
              <FileUp className="h-5 w-5" />
              <span>Import</span>
            </Link>
          </li>
          {auth.user?.is_admin && (
            <>
              <li>
                <Link to="/messages">
                  <MessageSquare className="h-5 w-5" />
                  <span>Messages</span>
                </Link>
              </li>
              <li>
                <Link to="/analytics">
                  <BarChart className="h-5 w-5" />
                  <span>Analytics</span>
                </Link>
              </li>
            </>
          )}
          <li>
            <button onClick={auth.logout} disabled={auth.loading}>
              <LogOut className="h-5 w-5" />
              <span>{auth.loading ? 'Signing out...' : 'Logout'}</span>
            </button>
          </li>
        </>
      ) : (
        <>
          <li>
            <Link to="/login">
              <LogIn className="h-5 w-5" />
              <span>Login</span>
            </Link>
          </li>
          <li>
            <Link to="/register">
              <UserPlus className="h-5 w-5" />
              <span>Register</span>
            </Link>
          </li>
        </>
      )}
    </ul>
  );
};
