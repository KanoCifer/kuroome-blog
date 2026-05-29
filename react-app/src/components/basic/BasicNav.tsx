import {
  IconArticleFilled,
  IconCategoryFilled,
  IconFileRssFilled,
  IconHomeFilled,
  IconDeviceDesktop,
} from '@tabler/icons-react';
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
import { RegisterIcon } from './icon/RegisterIcon';
import { Settings } from './icon/Settings';
import { ThemeIcon } from './icon/ThemeIcon';
import { useNavVisibility } from './NavVisibilityContext';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  iconColor: string;
  iconBg: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  to: string;
  isActive: boolean;
  isMore?: boolean;
  activeIcon?: React.ReactNode;
}

function NavItem({ icon, to, isActive, activeIcon }: NavItemProps) {
  return (
    <>
      <div className="flex items-center justify-center">
        <Link
          to={to}
          className={`flex h-14 w-16 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          {isActive && activeIcon ? activeIcon : icon}
        </Link>
      </div>
    </>
  );
}

function MenuItem({ icon, label, onClick, iconColor, iconBg }: MenuItemProps) {
  return (
    <button
      className="border-border/20 bg-card/40 flex items-center gap-2 rounded-2xl border p-4 transition-transform active:scale-95"
      onClick={(e) => onClick(e)}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
      >
        <span className={iconColor}>{icon}</span>
      </div>
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

const DesktopIcon = IconDeviceDesktop;

function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;domain=.kanocifer.chat`;
}

function switchToVue() {
  setCookie('device_force', 'vue', 30);
  window.location.href = 'https://kanocifer.chat';
}

export function BasicNav() {
  const auth = useAuthStore();
  const themeStore = useThemeState();
  const navigate = useNavigate();
  const { hidden } = useNavVisibility();
  const toggleTheme = (e: React.MouseEvent) => {
    themeStore.toggleThemeWithAnimation(e);
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
              className="bg-background/20 fixed inset-0 z-59 backdrop-blur-[2px]"
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
        <AnimatePresence mode="sync">
          {showMenu && (
            <motion.div
              key="more-menu"
              className="scrollbar-hide border-border/20 bg-card/80 fixed right-8 bottom-22 z-60 grid h-auto w-fit grid-cols-2 gap-2 overflow-hidden rounded-[2rem] border p-5 shadow-xl backdrop-blur-sm"
              initial={{ height: 0, opacity: 0.8, width: 0, y: 20 }}
              animate={{ height: 'auto', opacity: 1, width: 'auto', y: 0 }}
              exit={{ height: 0, opacity: 0, width: 0 }}
              transition={{
                type: 'spring',
                damping: 50,
                stiffness: 300,
                duration: 0.5,
              }}
            >
              <MenuItem
                icon={<BookshelfIcon className="h-6 w-6" />}
                label="Bookshelf"
                onClick={() => handleNav('/bookshelf')}
                iconColor="text-orange-500"
                iconBg="bg-orange-100"
              />
              <MenuItem
                icon={<MessagesIcon className="h-6 w-6" />}
                label="Messages"
                onClick={() => handleNav('/messages')}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-100"
              />
              <MenuItem
                icon={<AnalyticsIcon className="h-6 w-6" />}
                label="Analytics"
                onClick={() => handleNav('/analytics')}
                iconColor="text-cyan-500"
                iconBg="bg-cyan-100"
              />
              <MenuItem
                icon={<ImportIcon className="h-6 w-6" />}
                label="Import"
                onClick={() => handleNav('/import')}
                iconColor="text-indigo-500"
                iconBg="bg-indigo-100"
              />
              <MenuItem
                icon={<Settings className="h-6 w-6" />}
                label="Settings"
                onClick={() => handleNav('/settings')}
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
              <MenuItem
                icon={<ThemeIcon className="h-6 w-6" />}
                label="Theme"
                onClick={(e) => toggleTheme(e)}
                iconColor="text-primary"
                iconBg="bg-accent"
              />
              <MenuItem
                icon={<AboutIcon className="h-6 w-6" />}
                label="About"
                onClick={() => handleNav('/about')}
                iconColor="text-warning"
                iconBg="bg-warning/10"
              />
              {/* Auth section */}
              {!auth.isAuthenticated ? (
                <>
                  <MenuItem
                    icon={<LoginIcon className="h-6 w-6" />}
                    label="Login"
                    onClick={() => handleNav('/login')}
                    iconColor="text-success"
                    iconBg="bg-success/10"
                  />
                  <MenuItem
                    icon={<RegisterIcon className="h-6 w-6" />}
                    label="Register"
                    onClick={() => handleNav('/register')}
                    iconColor="text-primary"
                    iconBg="bg-primary/10"
                  />
                </>
              ) : (
                <MenuItem
                  icon={<LogoutIcon className="h-6 w-6" />}
                  label="Logout"
                  onClick={handleLogout}
                  iconColor="text-destructive"
                  iconBg="bg-destructive/10"
                />
              )}
              <MenuItem
                icon={<DesktopIcon className="h-6 w-6" />}
                label="Desktop"
                onClick={switchToVue}
                iconColor="text-teal-500"
                iconBg="bg-teal-100"
              />
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
              className="bg-card/80 fixed bottom-4 left-1/2 z-65 flex h-16 max-w-md -translate-x-1/2 items-center justify-around rounded-full px-6 py-3 shadow-lg backdrop-blur-sm"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <NavItem
                icon={<HomeIcon className="size-6" />}
                activeIcon={<IconHomeFilled className="size-6" />}
                to="/"
                isActive={location.pathname === '/'}
              />

              {/* Blog */}
              <NavItem
                icon={<Newspaper className="size-6" />}
                activeIcon={<IconArticleFilled className="size-6" />}
                to="/blog"
                isActive={location.pathname === '/blog'}
              />

              {/* RSS */}
              <NavItem
                icon={<Rss className="size-6" />}
                activeIcon={<IconFileRssFilled className="size-6" />}
                to="/rss"
                isActive={location.pathname === '/rss'}
              />

              {/* More */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className={`flex h-14 w-16 items-center justify-center rounded-full transition-all duration-200 ${
                    showMenu || isMore
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {showMenu || isMore ? (
                    <IconCategoryFilled className="size-6" />
                  ) : (
                    <MoreIcon className="size-6" />
                  )}
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
