import type { BlogListItem, CategoryItem } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import type { BlogPagination as BlogPaginationType } from '@/types';
import { formatDate } from '@/utils/formatdate';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BlogEmptyState } from './components/BlogEmptyState';
import { BlogErrorState } from './components/BlogErrorState';
import { BlogLoadingSkeleton } from './components/BlogLoadingSkeleton';
import { BlogPagination } from './components/BlogPagination';
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
        <div className="absolute -top-1 -right-1 flex items-center gap-1 rounded-tr-2xl rounded-bl-xl bg-linear-to-r from-blue-500 to-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
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
          className={`text-lg leading-snug font-semibold ${
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

export default function BlogListView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>(
    {},
  );
  const [pagination, setPagination] = useState<BlogPaginationType | null>(null);
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
              _id: post._id,
              title: post.title,
              body: post.body,
              category: post.category,
              is_pinned: false,
              created_at: post.created_at,
              updated_at: post.updated_at,
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
        <div className="ml-12 max-w-2xl px-4 py-4">
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
            className="block w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
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
            <BlogLoadingSkeleton key="loading" />
          ) : error ? (
            <BlogErrorState key="error" message={error} onRetry={handleRetry} />
          ) : posts.length === 0 ? (
            <BlogEmptyState
              key="empty"
              hasCategory={activeCategoryId !== null}
            />
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
            <BlogPagination
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
