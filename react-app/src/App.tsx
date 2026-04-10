import { router } from '@/router/index';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuthStore } from './stores/authState';
import { useTodoState } from './stores/todoState';

function App() {
  const auth = useAuthStore();
  const todoState = useTodoState();
  const [isReady, setIsReady] = useState(false);

  // 在应用启动时尝试从缓存加载用户信息
  // 这可以防止在页面刷新时用户状态丢失
  useEffect(() => {
    auth.hydrateAuth().finally(() => setIsReady(true));
  }, [auth]);

  // 初始化 Todo 数据（仅调用一次）
  useEffect(() => {
    todoState.hydrateTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return null;
  }

  return <RouterProvider router={router} />;
}

export default App;
