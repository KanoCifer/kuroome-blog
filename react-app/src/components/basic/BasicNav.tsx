import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authState';
import { useThemeState } from '../../stores/themeState';
import { AboutIcon } from './icon/AboutIcon';
import { AnalyticsIcon } from './icon/AnalyticsIcon';
import { BookshelfIcon } from './icon/BookshelfIcon';
import { HomeIcon } from './icon/HomeIcon';
import { ImportIcon } from './icon/ImportIcon';
import { LoginIcon } from './icon/LoginIcon';
import { LogoutIcon } from './icon/LogoutIcon';
import { MessagesIcon } from './icon/MessagesIcon';
import { MoreIcon } from './icon/MoreIcon';
import { PlusIcon } from './icon/PlusIcon';
import { RegisterIcon } from './icon/RegisterIcon';
import { Settings } from './icon/Settings';
import { ThemeIcon } from './icon/ThemeIcon';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  iconColor: string;
  iconBg: string;
  darkIconBg: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isActive: boolean;
}

function NavItem({ icon, label, to, isActive }: NavItemProps) {
  return (
    <>
      <div className="group flex flex-col items-center gap-0.5">
        <Link
          to={to}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
            isActive
              ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30'
              : 'text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400'
          }`}
        >
          {icon}
        </Link>
        <span
          className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${
            isActive
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {label}
        </span>
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  iconColor,
  iconBg,
  darkIconBg,
}: MenuItemProps) {
  return (
    <button
      className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
      onClick={onClick}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${darkIconBg}`}
      >
        <span className={iconColor}>{icon}</span>
      </div>
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

export function BasicNav() {
  const auth = useAuthStore();
  const themeStore = useThemeState();
  const navigate = useNavigate();

  const toggleTheme = () => {
    themeStore.toggleTheme();
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/');
  };
  const [showMenu, setShowMenu] = useState(false);

  const handleNav = (path: string) => {
    setShowMenu(false);
    navigate(path);
  };

  const location = useLocation();

  // 判断当前路径是否属于"更多"范畴
  const isMore = useMemo(() => {
    return !['/', '/blog', '/rss'].includes(location.pathname);
  }, [location.pathname]);

  return (
    <Fragment>
      {/* Backdrop Overlay */}
      {createPortal(
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="fixed inset-0 z-59 bg-black/20 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMenu(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* More Menu Bottom Sheet */}
      {createPortal(
        <AnimatePresence mode="wait">
          {showMenu && (
            <motion.div
              key="more-menu"
              className="fixed right-4 bottom-22.5 left-4 z-60 max-h-[70vh] overflow-y-auto rounded-[2rem] border border-white/20 bg-white/80 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 40 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="grid grid-cols-3 gap-3">
                <MenuItem
                  icon={<BookshelfIcon className="h-6 w-6" />}
                  label="Bookshelf"
                  onClick={() => handleNav('/bookshelf')}
                  iconColor="text-orange-500"
                  iconBg="bg-orange-100"
                  darkIconBg="dark:bg-orange-900/40"
                />
                <MenuItem
                  icon={<MessagesIcon className="h-6 w-6" />}
                  label="Messages"
                  onClick={() => handleNav('/messages')}
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-100"
                  darkIconBg="dark:bg-emerald-900/40"
                />
                <MenuItem
                  icon={<AnalyticsIcon className="h-6 w-6" />}
                  label="Analytics"
                  onClick={() => handleNav('/analytics')}
                  iconColor="text-cyan-500"
                  iconBg="bg-cyan-100"
                  darkIconBg="dark:bg-cyan-900/40"
                />
                <MenuItem
                  icon={<ImportIcon className="h-6 w-6" />}
                  label="Import"
                  onClick={() => handleNav('/import')}
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-100"
                  darkIconBg="dark:bg-indigo-900/40"
                />
                <MenuItem
                  icon={<Settings className="h-6 w-6" />}
                  label="Settings"
                  onClick={() => handleNav('/settings')}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-100"
                  darkIconBg="dark:bg-blue-900/40"
                />
                <MenuItem
                  icon={<ThemeIcon className="h-6 w-6" />}
                  label="Theme"
                  onClick={toggleTheme}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-100"
                  darkIconBg="dark:bg-purple-900/40"
                />
                <MenuItem
                  icon={<AboutIcon className="h-6 w-6" />}
                  label="About"
                  onClick={() => handleNav('/about')}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-100"
                  darkIconBg="dark:bg-amber-900/40"
                />
                {/* Auth section */}
                {!auth.isAuthenticated ? (
                  <>
                    <MenuItem
                      icon={<LoginIcon className="h-6 w-6" />}
                      label="Login"
                      onClick={() => handleNav('/login')}
                      iconColor="text-green-500"
                      iconBg="bg-green-100"
                      darkIconBg="dark:bg-green-900/40"
                    />
                    <MenuItem
                      icon={<RegisterIcon className="h-6 w-6" />}
                      label="Register"
                      onClick={() => handleNav('/register')}
                      iconColor="text-blue-500"
                      iconBg="bg-blue-100"
                      darkIconBg="dark:bg-blue-900/40"
                    />
                  </>
                ) : (
                  <MenuItem
                    icon={<LogoutIcon className="h-6 w-6" />}
                    label="Logout"
                    onClick={handleLogout}
                    iconColor="text-red-500"
                    iconBg="bg-red-100"
                    darkIconBg="dark:bg-red-900/40"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Bottom Navigation Bar */}
      {createPortal(
        <motion.nav
          id="mobile-nav"
          className="fixed bottom-0 left-0 z-65 flex h-20 w-full items-center justify-around rounded-t-[2.5rem] bg-white/80 px-6 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:bg-slate-900/80 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <NavItem
            icon={<HomeIcon className="h-5 w-5" />}
            label="Home"
            to="/"
            isActive={location.pathname === '/'}
          />
          <NavItem
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            }
            label="Blogs"
            to="/blog"
            isActive={location.pathname === '/blog'}
          />

          {/* New Post Button */}
          <Link
            to="/blog/new"
            className="-mt-10 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/50 bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-xl shadow-blue-500/35 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/40 active:scale-95 dark:border-slate-800/50 dark:shadow-blue-400/30"
          >
            <PlusIcon className="h-6 w-6" />
          </Link>

          {/* RSS */}
          <NavItem
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            }
            label="RSS"
            to="/rss"
            isActive={location.pathname === '/rss'}
          />

          {/* More */}
          <div className="group flex flex-col items-center gap-0.5">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                showMenu || isMore
                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-400/30'
                  : 'text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400'
              }`}
            >
              <MoreIcon className="h-5 w-5" />
            </button>
            <span
              className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${
                showMenu || isMore
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              More
            </span>
          </div>
        </motion.nav>,
        document.body,
      )}
    </Fragment>
  );
}
