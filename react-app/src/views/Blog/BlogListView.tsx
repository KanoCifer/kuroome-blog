import type { BlogListItem, CategoryItem } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import type { BlogPagination as BlogPaginationType } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { useOrigin } from '@/hooks/useOrigin';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BlogEmptyState } from './components/BlogEmptyState';
import { BlogErrorState } from './components/BlogErrorState';
import { BlogLoadingSkeleton } from './components/BlogLoadingSkeleton';
import { BlogPagination } from './components/BlogPagination';
import { CategorySidebar } from './components/CategorySidebar';

interface PostCardProps {
  post: BlogListItem;
  index: number;
}

function PostCard({ post, index }: PostCardProps) {
  // 非 http(s) 开头的 src 用 https://api.kanocifer.chat 作为前缀（仅在 https 环境下生效）
  const coverSrc = useOrigin(post.cover ?? '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', duration: 0.5, delay: index * 0.06 }}
    >
      <Link to={`/blog/${post._id}`} className="group block">
        <article className="border-border/40 bg-card group-hover:border-primary/25 relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-md">
          {post.cover && (
            <div className="border-border bg-muted mb-4 aspect-[16/9] overflow-hidden rounded-2xl border">
              <img
                src={coverSrc}
                alt={`${post.title} 封面`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}

          {/* Left spine accent */}
          <div
            className="bg-primary absolute top-0 left-0 h-full w-1 origin-top scale-y-0 rounded-r-full transition-transform duration-500 ease-out group-hover:scale-y-100"
            aria-hidden="true"
          />

          {/* Pinned badge */}
          {post.is_pinned && (
            <div className="mb-4">
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                置顶
              </span>
            </div>
          )}

          {/* Title */}
          <h2
            className="text-primary group-hover:text-primary group-hover:bg-primary/30 w-fit rounded-full px-3 py-2 font-serif text-2xl leading-snug transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-sm"
            style={{ textWrap: 'balance' }}
          >
            {post.title}
          </h2>

          {/* Decorative divider */}
          <div
            className="bg-border group-hover:bg-primary/15 my-4 h-1 w-16 transition-all duration-500 ease-out group-hover:w-full"
            aria-hidden="true"
          />

          {/* Summary */}
          {post.summary && (
            <p className="text-foreground/60 line-clamp-3 text-sm leading-relaxed">
              {post.summary}
            </p>
          )}

          {/* Footer meta */}
          <footer className="text-muted-foreground mt-5 flex items-center gap-2 text-xs">
            <time>{formatDate(post.created_at)}</time>
            {post.category && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-border/60">
                  ·
                </span>
                # {post.category.name}
              </span>
            )}
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
              summary: post.summary || '',
              cover: post.cover,
              category: post.category,
              is_pinned: false,
              created_at: post.created_at,
              updated_at: post.updated_at,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="ml-12 px-5 pt-5 pb-2">
          <h1 className="text-foreground text-2xl font-bold">博客</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            分享阅读心得、技术思考
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2">
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
            placeholder="搜索文章标题和内容..."
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
      <div className="px-5 pb-4">
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
      <div ref={listRef} className="px-5 pb-10">
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
