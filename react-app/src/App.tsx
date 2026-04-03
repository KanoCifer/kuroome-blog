import { router } from '@/router/index';
import { RouterProvider } from 'react-router-dom';
import { useAuthStore } from './stores/authState';

function App() {
  const auth = useAuthStore();

  // 在应用启动时尝试从缓存加载用户信息
  // 这可以防止在页面刷新时用户状态丢失
  if (!auth.isHydrated) {
    auth.hydrateAuth();
  }

  return <RouterProvider router={router} />;
}

export default App;
