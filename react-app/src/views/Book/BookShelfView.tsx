import { BookCard } from '@/components/books/BookCard';
import { bookService, type BookService } from '@/services/bookService';
import { useNotificationStore } from '@/stores/notificationState';
import type { BookItem, Pagination } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function BookShelfView() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const notifier = useNotificationStore();
  const serviceRef = useRef<BookService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = bookService();
  }
  const service = serviceRef.current;

  const booksCount = pagination?.total ?? books.length;

  const fetchBooks = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await service.getBooks({ page, per_page: 12 });
        setBooks(data.books ?? []);
        setPagination(data.pagination ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : '获取书籍列表失败';
        setErrorMessage(message);
        notifier.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [notifier, service],
  );

  useEffect(() => {
    void fetchBooks(1);
  }, [fetchBooks]);

  const visiblePages = useMemo(() => {
    if (!pagination) return [];
    const totalPages = pagination.pages;
    const current = pagination.page;
    const pages: number[] = [];
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(totalPages - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    return pages;
  }, [pagination]);

  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.pages) return;
    void fetchBooks(page);
  };

  return (
    <div className="mx-auto my-8 mb-20 min-h-screen w-full max-w-5xl rounded-[32px] bg-gray-50/70 px-4 py-6 sm:my-16 sm:px-6 lg:px-8 dark:bg-gray-900/50">
      <div className="mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                我的书架
              </h1>
              <span className="rounded-full border border-blue-300 bg-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-200 dark:text-blue-900">
                {booksCount}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              管理您的阅读收藏
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800"
              >
                <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700" />
                <div className="p-4">
                  <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm dark:bg-gray-800">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="mb-4 text-center text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-700 focus:outline-none"
              onClick={() => fetchBooks(pagination?.page ?? 1)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.731 4.002l.129-.143a8.25 8.25 0 0113.803 3.7M4.731 4.002l3.181-3.182"
                />
              </svg>
              重试
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && books.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 text-center shadow-sm dark:bg-gray-800">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-10 w-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h3 className="mb-2 font-serif text-lg font-semibold text-gray-900 dark:text-white">
              暂无书籍
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              您的书架还是空的，快去导入一些书籍吧
            </p>
            <Link
              to="/import"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              导入书籍
            </Link>
          </div>
        )}

        {!isLoading && !errorMessage && books.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} />
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center gap-2 text-sm">
              <button
                type="button"
                disabled={!pagination.has_prev}
                className="rounded-lg px-3 py-2 font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
                onClick={() => goToPage(pagination.prev_num ?? 1)}
              >
                上一页
              </button>
              <div className="flex items-center gap-1">
                {pagination.page > 2 && (
                  <button
                    type="button"
                    className="min-w-[32px] rounded-lg px-2 py-2 font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={() => goToPage(1)}
                  >
                    1
                  </button>
                )}
                {pagination.page > 3 && (
                  <span className="px-1 text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )}
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`min-w-[32px] rounded-lg px-2 py-2 font-medium transition-colors ${
                      page === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                {pagination.page < pagination.pages - 2 && (
                  <span className="px-1 text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )}
                {pagination.page < pagination.pages - 1 && (
                  <button
                    type="button"
                    className="min-w-[32px] rounded-lg px-2 py-2 font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={() => goToPage(pagination.pages)}
                  >
                    {pagination.pages}
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={!pagination.has_next}
                className="rounded-lg px-3 py-2 font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
                onClick={() =>
                  goToPage(pagination.next_num ?? pagination.pages)
                }
              >
                下一页
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
