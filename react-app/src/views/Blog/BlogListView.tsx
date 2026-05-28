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
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', duration: 0.5, delay: index * 0.06 }}
    >
      <Link to={`/blog/${post._id}`} className="group block">
        <article className="border-border/40 bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:border-primary/25 group-hover:shadow-md">
          {/* Left spine accent */}
          <div
            className="bg-primary absolute top-0 left-0 h-full w-1 origin-top scale-y-0 rounded-r-full transition-transform duration-500 ease-out group-hover:scale-y-100"
            aria-hidden="true"
          />

          {/* Pinned badge */}
          {post.is_pinned && (
            <div className="mb-3">
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                置顶
              </span>
            </div>
          )}

          {/* Title */}
          <h2
            className="text-primary w-fit font-serif text-xl leading-snug transition-all duration-300 ease-out group-hover:bg-primary/10 group-hover:-translate-y-0.5 group-hover:rounded-lg group-hover:px-2 group-hover:shadow-sm"
            style={{ textWrap: 'balance' }}
          >
            {post.title}
          </h2>

          {/* Decorative divider */}
          <div
            className="bg-border my-3 h-1 w-16 transition-all duration-500 ease-out group-hover:w-full group-hover:bg-primary/15"
            aria-hidden="true"
          />

          {/* Summary */}
          <div
            className="line-clamp-3 text-sm leading-relaxed text-foreground/60 dark:text-white/60"
            dangerouslySetInnerHTML={{ __html: getPreviewHtml(post.body) }}
          />

          {/* Footer meta */}
          <footer className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <time>{formatDate(post.created_at)}</time>
            {post.category && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-border/60">·</span>
                # {post.category.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="text-border/60">·</span>
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
          </footer>
        </article>
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
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <div className="bg-surface sticky top-0 z-10 backdrop-blur-md">
        <div className="ml-12 max-w-2xl px-4 py-4">
          <h1 className="text-foreground text-2xl font-bold">博客</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            分享阅读心得、技术思考
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="text-muted-foreground h-5 w-5"
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
            className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 block w-full rounded-xl border py-3 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3"
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
