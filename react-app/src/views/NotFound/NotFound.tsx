import { useNavigate } from 'react-router-dom';
import { useLottie } from 'lottie-react';
import animationData from '@/assets/404.json';

export default function NotFound() {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const options = {
    animationData: animationData,
    loop: true,
    autoplay: true,
  };

  const style = {
    width: 320,
    height: 320,
    borderRadius: '2rem',
  };

  const { View } = useLottie(options, style);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-4xl bg-gray-100/70 p-8 text-center backdrop-blur-sm dark:bg-gray-800/50">
        <div className="relative mx-auto h-32 w-32">
          <div className="absolute inset-0 animate-pulse rounded-full bg-blue-100 dark:bg-blue-900/30"></div>
          <div className="relative flex h-full items-center justify-center">
            <span className="text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              404
            </span>
          </div>
        </div>

        <h1 className="mt-8 font-serif text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
          页面未找到
        </h1>

        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          抱歉，您访问的页面不存在或已被移动。
        </p>

        <div className="mt-6 space-y-2 text-sm text-gray-500 dark:text-gray-500">
          <p>• 网址可能拼写错误</p>
          <p>• 页面可能已被删除</p>
          <p>• 链接可能已过期</p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              ></path>
            </svg>
            返回首页
          </button>

          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 focus:outline-none dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
            上一页
          </button>
        </div>
      </div>

      <div className="mt-16 flex gap-2 text-gray-400 dark:text-gray-600">
        <div className="h-1 w-1 animate-bounce rounded-full bg-current"></div>
        <div
          className="h-1 w-1 animate-bounce rounded-full bg-current"
          style={{ animationDelay: '0.1s' }}
        ></div>
        <div
          className="h-1 w-1 animate-bounce rounded-full bg-current"
          style={{ animationDelay: '0.2s' }}
        ></div>
      </div>
      <div className="mt-8">{View}</div>
    </div>
  );
}
