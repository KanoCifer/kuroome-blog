import { bookService } from '@/services/bookService';
import { useNotificationStore } from '@/stores/notificationState';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'weread_cookie';

export default function ImportBookView() {
  const [wereadCookie, setWereadCookie] = useState('');
  const [loading, setLoading] = useState(false);
  const notifier = useNotificationStore();
  const service = useMemo(() => bookService(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCookie = localStorage.getItem(STORAGE_KEY);
    if (savedCookie) {
      setWereadCookie(savedCookie);
    }
  }, []);

  const saveToLocalStorage = (value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, value);
  };

  const submitImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const importedCount = await service.importBooks({
        weread_cookie: wereadCookie,
      });
      notifier.success(`Successfully imported ${importedCount} books!`);
      saveToLocalStorage(wereadCookie);
    } catch (error) {
      console.error('Error during import:', error);
      notifier.error('Cookie过期或无效，请重新获取并输入有效的 WEREAD Cookie！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-16">
      <motion.div
        className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/20 bg-white/40 p-8 shadow-2xl backdrop-blur dark:border-gray-700/30 dark:bg-gray-900/40 sm:p-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="bg-linear-to-r from-blue-600 to-sky-600 bg-clip-text text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-transparent dark:from-blue-400 dark:to-sky-400">
            Import Your Bookshelf
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Import your books from WeRead by providing your account cookie
          </p>
        </div>

        <form onSubmit={submitImport} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="weread_cookie"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              WeRead Cookie
            </label>
            <textarea
              id="weread_cookie"
              value={wereadCookie}
              onChange={(event) => setWereadCookie(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-sm transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
              rows={8}
              placeholder="Paste your WeRead cookie here..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your cookie will be saved locally in your browser for future use
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-linear-to-r from-blue-500 to-sky-600 px-6 py-4 font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing Books...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Start Import
              </span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
