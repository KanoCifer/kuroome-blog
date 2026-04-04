import { BasicFooter } from '@/components/basic/BasicFooter';
import { useAuthStore } from '@/stores/authState';
import { motion } from 'framer-motion';
import {
  BarChart,
  BookOpen,
  ChevronDown,
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
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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

export const BentoNavSidebar: React.FC = () => {
  const auth = useAuthStore();
  const location = useLocation();
  const activeIndex = navItems.findIndex(
    (item) => location.pathname === item.path,
  );
  const [hoverNavIndex, setHoverNavIndex] = useState(
    activeIndex !== -1 ? activeIndex : 0,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserName = auth.isAuthenticated
    ? auth.user?.name || '用户'
    : '游客';
  const avatarUrl =
    auth.isAuthenticated && auth.user?.photo
      ? auth.user.photo.startsWith('http')
        ? auth.user.photo
        : `/api/v1/media/${auth.user.photo}`
      : '/images/about.webp';

  const handleLoginout = () => {
    try {
      setIsLoading(true);
      if (auth.isAuthenticated) {
        auth.logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const index = navItems.findIndex((item) => location.pathname === item.path);
    if (index !== -1) {
      setHoverNavIndex(index);
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Header / Sidebar Toggle */}
      <div className="fixed top-0 left-0 w-full z-50 p-4 pointer-events-none">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-gray-100/80 rounded-full shadow-md pointer-events-auto dark:bg-gray-500/20 backdrop-blur-sm transition-transform active:scale-95"
        >
          <Home className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-90 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-100 w-80 p-6 bg-gray-100 dark:bg-gray-800 rounded-r-2xl text-base-content flex flex-col gap-6 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Profile Dropdown */}
        <div className="relative">
          <div
            className="flex items-center gap-4 px-2 hover:cursor-pointer transition-transform active:scale-95"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <img
              src={avatarUrl}
              alt={currentUserName}
              className="h-14 w-14 rounded-full object-cover shadow-sm ring-4 ring-blue-300"
            />
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-base-content select-none">
                {currentUserName}
              </span>
              <ChevronDown className="h-4 w-4 text-base-content/70" />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 mt-4 w-60 bg-gray-200 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1 selection-none"
            >
              {auth.isAuthenticated ? (
                <>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                  >
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link
                    to="/import"
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                  >
                    <FileUp className="h-4 w-4" /> Import
                  </Link>
                  {auth.user?.is_admin && (
                    <>
                      <Link
                        to="/messages"
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                      >
                        <MessageSquare className="h-4 w-4" /> Messages
                      </Link>
                      <Link
                        to="/analytics"
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                      >
                        <BarChart className="h-4 w-4" /> Analytics
                      </Link>
                    </>
                  )}
                  <div className="h-px bg-gray-300 my-1"></div>
                  <button
                    onClick={handleLoginout}
                    disabled={isLoading}
                    className="flex items-center gap-2 p-2 rounded-xl text-error hover:bg-error/10 font-bold"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoading ? 'Signing out...' : 'Logout'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                  >
                    <LogIn className="h-4 w-4" /> Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-300 select-none"
                  >
                    <UserPlus className="h-4 w-4" /> Register
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </div>

        <div className="px-3 text-sm font-bold tracking-wider text-base-content/50 mt-4 border-b pb-2">
          GENERAL
        </div>

        {/* Navigation List */}
        <ul className="flex flex-col gap-2 relative grow">
          {/* Active indicator */}
          <motion.div
            className="absolute left-0 w-full h-12 bg-blue-300 rounded-2xl"
            animate={{ y: hoverNavIndex * 56 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ zIndex: 0 }}
          />

          {navItems.map((item, index) => (
            <li
              key={item.path}
              onMouseEnter={() => setHoverNavIndex(index)}
              className="z-10 h-12 flex"
            >
              <Link
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 w-full rounded-2xl h-full font-medium transition-colors ${
                  hoverNavIndex === index
                    ? 'text-primary'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-[15px]">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-1 border-t mb-20">
          <BasicFooter />
        </div>
      </aside>
    </>
  );
};
