import { BasicFooter } from '@/components/basic/BasicFooter';
import { useAuthStore } from '@/stores/authState';
import { useVisitorCountStore } from '@/stores/visitorCountStore';
import { IconCoin } from '@tabler/icons-react';
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
  TextAlignJustify,
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
  { path: '/subscription', label: 'SubTracker', icon: IconCoin },
  { path: '/toolbox/image-toolbox', label: '图片工具', icon: Wrench },
  { path: '/about', label: '关于网站', icon: Info },
];

function DropDownItems() {
  const auth = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

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

  if (auth.isAuthenticated) {
    return (
      <>
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
        >
          <User className="h-4 w-4" /> Profile
        </Link>
        <Link
          to="/import"
          className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
        >
          <FileUp className="h-4 w-4" /> Import
        </Link>
        {auth.user?.is_admin && (
          <>
            <Link
              to="/messages"
              className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
            >
              <MessageSquare className="h-4 w-4" /> Messages
            </Link>
            <Link
              to="/analytics"
              className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
            >
              <BarChart className="h-4 w-4" /> Analytics
            </Link>
          </>
        )}
        <div className="my-1 h-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          onClick={handleLoginout}
          disabled={isLoading}
          className="text-error hover:bg-error/10 flex items-center gap-2 rounded-xl p-2 font-bold"
        >
          <LogOut className="h-4 w-4" />
          {isLoading ? 'Signing out...' : 'Logout'}
        </button>
      </>
    );
  } else {
    return (
      <>
        <Link
          to="/login"
          className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
        >
          <LogIn className="h-4 w-4" /> Login
        </Link>
        <Link
          to="/register"
          className="flex items-center gap-2 rounded-xl p-2 select-none hover:bg-gray-300 dark:hover:bg-gray-800"
        >
          <UserPlus className="h-4 w-4" /> Register
        </Link>
      </>
    );
  }
}

function DelayStatus({ ms }: { ms: number }) {
  if (!ms) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-400" />
        </span>
        延迟 -- ms
      </span>
    );
  }
  const label = `${Math.round(ms)} ms`;
  const dotClass =
    ms < 200
      ? 'bg-emerald-500'
      : ms < 2000
        ? 'bg-yellow-500'
        : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotClass}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`}
        />
      </span>
      延迟 {label}
    </span>
  );
}

export const BentoNavSidebar: React.FC = () => {
  const auth = useAuthStore();
  const visitorCount = useVisitorCountStore((s) => s.count);
  const connectionDelay = useVisitorCountStore((s) => s.connectionDelay);
  const location = useLocation();
  const activeIndex = navItems.findIndex(
    (item) => location.pathname === item.path,
  );
  const [hoverNavIndex, setHoverNavIndex] = useState(
    activeIndex !== -1 ? activeIndex : 0,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentUserName = auth.isAuthenticated
    ? auth.user?.name || '用户'
    : '游客';
  const avatarUrl =
    auth.isAuthenticated && auth.user?.photo
      ? auth.user.photo.startsWith('http')
        ? auth.user.photo
        : `/api/v1/media/${auth.user.photo}`
      : '/images/about.webp';

  useEffect(() => {
    const index = navItems.findIndex((item) => location.pathname === item.path);
    if (index !== -1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHoverNavIndex(index);
    }
  }, [location.pathname]);

  // 侧边栏打开时禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 侧边栏开关键 */}
      <div className="pointer-events-none fixed top-0 left-0 z-50 w-full p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto rounded-full bg-gray-100/50 p-2 shadow-lg backdrop-blur-sm transition-transform active:scale-95 dark:bg-gray-500/20"
        >
          <TextAlignJustify className="h-6 w-6 text-gray-500 dark:text-white" />
        </button>
      </div>

      {/* 背景层 */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-90 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* 侧边栏 */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{
          duration: 0.3,
          ease: 'easeInOut',
        }}
        className="fixed top-0 left-0 z-100 flex h-screen w-80 flex-col gap-6 rounded-r-4xl bg-gray-50/90 p-6 backdrop-blur-sm dark:bg-gray-800/80"
      >
        {/* 下拉菜单 */}
        <div className="relative">
          <div
            className="flex items-center gap-4 px-2 transition-transform hover:cursor-pointer active:scale-95"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <img
              src={avatarUrl}
              alt={currentUserName}
              className="h-14 w-14 rounded-full object-cover shadow-[0_0_14px_rgba(0,0,0,0.8)] ring-4 ring-blue-500"
            />
            <div className="flex items-baseline gap-2">
              <span className="text-base-content font-serif text-2xl font-bold select-none">
                {currentUserName}
              </span>
              <ChevronDown className="text-base-content/70 h-4 w-4" />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="selection-none absolute top-full left-0 z-50 mt-4 flex w-60 flex-col gap-1 rounded-2xl bg-gray-200 p-2 shadow-xl dark:bg-gray-600"
            >
              <DropDownItems />
            </motion.div>
          )}
        </div>

        <div className="text-base-content/50 mt-4 border-b px-3 pb-2 text-sm font-bold tracking-wider">
          GENERAL
        </div>

        {/* Navigation List */}
        <ul className="relative flex grow flex-col gap-1">
          {/* Active indicator */}
          <motion.div
            className="pointer-events-none absolute left-0 h-12 w-full rounded-2xl bg-blue-500 shadow-md dark:bg-blue-600/50"
            animate={{ y: hoverNavIndex * 52 }} // 52 = item height (48) + gap (4)
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ zIndex: 0 }}
          />

          {navItems.map((item, index) => (
            <li
              key={item.path}
              onMouseEnter={() => setHoverNavIndex(index)}
              className="z-10 flex h-12"
            >
              <Link
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex h-full w-full items-center gap-4 rounded-2xl px-4 font-medium transition-colors ${
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

        {/* 状态栏：在线人数 + 延迟 */}
        <div className="flex items-center justify-between px-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {visitorCount} 人在线
          </span>
          <DelayStatus ms={connectionDelay} />
        </div>

        <div className="mb-30 border-t pt-1 text-center text-sm">
          <BasicFooter />
        </div>
      </motion.aside>
    </>
  );
};
