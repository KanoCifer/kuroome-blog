import { router } from '@/router/index';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useWebsocket } from './hooks/useWebsocket';
import { useAuthStore } from './stores/authState';
import { useTodoState } from './stores/todoState';
import { useVisitorCountStore } from './stores/visitorCountStore';
import { getVisitorId } from './utils/visitorTracker';
import { buildWsUrl } from './utils/buildWsUrl';

function App() {
  const auth = useAuthStore();
  const todoState = useTodoState();
  const setCount = useVisitorCountStore((s) => s.setCount);
  const setConnectionDelay = useVisitorCountStore((s) => s.setConnectionDelay);
  const [isReady, setIsReady] = useState(false);

  // WebSocket — anonymous visitor connection
  useWebsocket({
    url: buildWsUrl(),
    visitorId: getVisitorId(),
    onCount: setCount,
    onConnectionDelay: setConnectionDelay,
  });

  // 在应用启动时尝试从缓存加载用户信息
  // 这可以防止在页面刷新时用户状态丢失
  useEffect(() => {
    auth.hydrateAuth().finally(() => setIsReady(true));
  }, [auth]);

  // 初始化 Todo 数据（仅调用一次）
  useEffect(() => {
    todoState.hydrateTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return null;
  }

  return <RouterProvider router={router} />;
}

export default App;
