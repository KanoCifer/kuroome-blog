import type { BlogListItem, CategoryItem } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import type { BlogPagination } from '@/types';
import { formatDate } from '@/utils/formatdate';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategorySidebar } from './components/CategorySidebar';

function getPreviewHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

interface PostCardProps {
  post: BlogListItem;
  index: number;
}

function PostCard({ post, index }: PostCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl ${
        post.is_pinned
          ? 'bg-linear-to-br from-blue-50 to-sky-50 ring-2 ring-blue-400/30 dark:from-slate-800/80 dark:to-slate-800/60 dark:ring-blue-500/30'
          : 'bg-white dark:bg-gray-900'
      }`}
    >
      {/* Pinned Badge */}
      {post.is_pinned && (
        <div className="absolute -top-1 -right-1 flex items-center gap-1 rounded-bl-xl rounded-tr-2xl bg-linear-to-r from-blue-500 to-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          置顶
        </div>
      )}

      <Link to={`/blog/${post._id}`} className="block p-4">
        {/* Title */}
        <h2
          className={`text-lg font-semibold leading-snug ${
            post.is_pinned
              ? 'text-blue-900 dark:text-blue-100'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {post.title}
        </h2>

        {/* Meta */}
        <p
          className={`mt-2 text-xs ${
            post.is_pinned
              ? 'text-blue-700/70 dark:text-blue-300/70'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {formatDate(post.created_at)}
          {post.category && (
            <span className="ml-2 inline-flex items-center gap-1">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {post.category.name}
            </span>
          )}
          <span className="ml-2 inline-flex items-center gap-1">
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {post.comment_count}
          </span>
        </p>

        {/* Preview */}
        <div
          className={`mt-3 line-clamp-3 text-sm leading-relaxed ${
            post.is_pinned
              ? 'text-blue-800/80 dark:text-blue-200/80'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          dangerouslySetInnerHTML={{ __html: getPreviewHtml(post.body) }}
        />

        {/* Read More */}
        <div
          className={`mt-3 inline-flex items-center text-sm font-medium ${
            post.is_pinned
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          阅读全文
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-white p-4 dark:bg-gray-900"
        >
          <div className="h-6 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-3 h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-8 text-center dark:border-red-800/50 dark:bg-red-900/20">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <p className="mt-4 text-lg font-medium text-red-600 dark:text-red-400">
        加载失败
      </p>
      <p className="mt-1 text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 active:scale-95 transition-transform"
      >
        重试
      </button>
    </div>
  );
}

function EmptyState({ hasCategory }: { hasCategory: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-700/50 dark:bg-gray-900/30">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-gray-300 dark:text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
        />
      </svg>
      <p className="mt-4 text-base font-medium text-gray-500">暂无文章</p>
      <p className="mt-1 text-sm text-gray-400">
        {hasCategory ? '该分类下还没有文章' : '稍后再来看看吧'}
      </p>
    </div>
  );
}

function Pagination({
  pagination,
  currentPage,
  onPageChange,
}: {
  pagination: BlogPagination;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const { page, pages: totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <nav className="flex justify-center gap-1" aria-label="分页">
      <button
        disabled={!pagination.has_prev}
        onClick={() => onPageChange(pagination.prev_num || 1)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-400"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {getVisiblePages().map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            onClick={() => onPageChange(p)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {p}
          </button>
        ) : (
          <span
            key={i}
            className="flex h-10 w-10 items-center justify-center text-gray-400"
          >
            {p}
          </span>
        ),
      )}

      <button
        disabled={!pagination.has_next}
        onClick={() => onPageChange(pagination.next_num || pagination.pages)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-400"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  );
}

export default function BlogListView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>(
    {},
  );
  const [pagination, setPagination] = useState<BlogPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || '',
  );
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1,
  );

  const listRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(
    async (page: number = 1, categoryId?: number | null) => {
      setIsLoading(true);
      setError(null);

      try {
        const service = blogService();
        const search = searchParams.get('search') || undefined;

        if (categoryId !== undefined && categoryId !== null) {
          const result = await service.getPostsByCategory(categoryId);
          setPosts(
            result.posts.map((post) => ({
              ...post,
              is_pinned: false,
              comment_count: 0,
            })),
          );
          setPagination(null);
        } else {
          const result = await service.getBlogs({ page, search });
          setPosts(result.posts);
          setCategories(result.categories);
          setCategoryCounts(result.categoryCounts);
          setPagination(result.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载文章列表失败');
      } finally {
        setIsLoading(false);
      }
    },
    [searchParams],
  );

  useEffect(() => {
    fetchPosts(currentPage, activeCategoryId);
  }, [fetchPosts, currentPage, activeCategoryId]);

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
    setCurrentPage(page);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setActiveCategoryId(categoryId);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.set('page', '1');
    if (categoryId !== null) {
      newParams.set('categoryId', categoryId.toString());
    } else {
      newParams.delete('categoryId');
    }
    setSearchParams(newParams);
  };

  const handleRetry = () => {
    fetchPosts(currentPage, activeCategoryId);
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            博客
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            分享阅读心得、技术思考
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索文章..."
            className="block w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="mx-auto max-w-2xl px-4 pb-3">
        <CategorySidebar
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: '',
            post_count: c.post_count,
            posts_count: c.post_count,
            created_at: '',
            updated_at: '',
          }))}
          categoryCounts={categoryCounts}
          activeCategoryId={activeCategoryId}
          onSelectCategory={handleCategorySelect}
          isLoading={isLoading && categories.length === 0}
        />
      </div>

      {/* Content */}
      <div ref={listRef} className="mx-auto max-w-2xl px-4 pb-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingSkeleton key="loading" />
          ) : error ? (
            <ErrorState key="error" message={error} onRetry={handleRetry} />
          ) : posts.length === 0 ? (
            <EmptyState key="empty" hasCategory={activeCategoryId !== null} />
          ) : (
            <motion.div
              key="posts"
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {posts.map((post, index) => (
                <PostCard key={post._id} post={post} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {!isLoading && !error && pagination && pagination.pages > 1 && (
          <div className="mt-8">
            <Pagination
              pagination={pagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
