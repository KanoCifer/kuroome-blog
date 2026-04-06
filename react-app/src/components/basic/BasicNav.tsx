import { Newspaper, Rss } from 'lucide-react';
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
import { useNavVisibility } from './NavVisibilityContext';

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
  to: string;
  isActive: boolean;
  isMore?: boolean;
}

function NavItem({ icon, to, isActive }: NavItemProps) {
  return (
    <>
      <div className="flex items-center justify-center">
        <Link
          to={to}
          className={`flex h-14 w-16 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
            isActive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400'
          }`}
        >
          {icon}
        </Link>
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
      className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-4 transition-transform active:scale-95 dark:bg-white/5"
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
  const { hidden } = useNavVisibility();
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
              className="grid grid-cols-2 gap-2 fixed bottom-26 w-fit scrollbar-hide right-8 z-60 max-h-[70vh] overflow-y-auto rounded-[2rem] border border-white/20 bg-white/80 p-5 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Bottom Navigation Bar */}
      {createPortal(
        <AnimatePresence>
          {hidden ? null : (
            <motion.nav
              id="mobile-nav"
              className="fixed bottom-4 left-1/2 z-65 flex h-16 max-w-md shadow-lg -translate-x-1/2 items-center justify-around rounded-full bg-white/80 px-6 py-3 backdrop-blur-sm dark:bg-slate-900/80 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <NavItem
                icon={<HomeIcon className="h-5 w-5" />}
                to="/"
                isActive={location.pathname === '/'}
              />

              {/* Blog */}
              <NavItem
                icon={<Newspaper className="h-5 w-5" />}
                to="/blog"
                isActive={location.pathname === '/blog'}
              />

              {/* New Post Button */}
              <NavItem
                icon={<PlusIcon className="size-8" />}
                to="/new"
                isActive={location.pathname === '/new'}
              />

              {/* RSS */}
              <NavItem
                icon={<Rss className="h-5 w-5" />}
                to="/rss"
                isActive={location.pathname === '/rss'}
              />

              {/* More */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className={`flex h-14 w-16 items-center justify-center rounded-full transition-all duration-200 ${
                    showMenu || isMore
                      ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
                >
                  <MoreIcon className="h-5 w-5" />
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </Fragment>
  );
}
