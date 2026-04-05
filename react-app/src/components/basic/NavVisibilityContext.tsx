import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface NavVisibilityContextType {
  hidden: boolean;
  hideNav: () => void;
  showNav: () => void;
}

const NavVisibilityContext = createContext<NavVisibilityContextType | null>(
  null,
);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  const hideNav = useCallback(() => setHidden(true), []);
  const showNav = useCallback(() => setHidden(false), []);

  const value = useMemo(
    () => ({ hidden, hideNav, showNav }),
    [hidden, hideNav, showNav],
  );

  return (
    <NavVisibilityContext.Provider value={value}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNavVisibility = () => {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx)
    throw new Error(
      'useNavVisibility must be used within NavVisibilityProvider',
    );
  return ctx;
};
