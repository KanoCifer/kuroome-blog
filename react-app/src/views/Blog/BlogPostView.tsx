import { ArticleSummaryCard } from '@/components/basic/ArticleSummary';
import type { BlogDetail } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import { TwikooComments } from '@/components/blog/TwikooComments';
import { useNotificationStore } from '@/stores/notificationState';
import { formatDate } from '@/utils/formatdate';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-4">
      <div className="space-y-4">
        <div className="bg-muted h-8 w-3/4 rounded-lg" />
        <div className="bg-muted h-4 w-1/4 rounded" />
      </div>
      <div className="space-y-3">
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-2/3 rounded" />
      </div>
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
    <div className="border-destructive/30 bg-destructive/10 mx-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="text-destructive/80 h-12 w-12"
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
      <p className="text-destructive mt-4 text-lg font-medium">加载失败</p>
      <p className="text-destructive/80 mt-1 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="bg-destructive hover:bg-destructive/90 mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95"
      >
        重试
      </button>
    </div>
  );
}

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;

function setupCodeCopy(
  container: HTMLElement,
  onCopy: (msg: string) => void,
): () => void {
  const preElements = container.querySelectorAll('pre');
  const cleanups: (() => void)[] = [];

  preElements.forEach((pre) => {
    pre.style.position = 'relative';
    pre.classList.add('group');

    const btn = document.createElement('button');
    btn.innerHTML = COPY_ICON_SVG;
    btn.title = '复制';
    btn.className =
      'absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-accent cursor-pointer';
    btn.setAttribute('aria-label', '复制代码');

    const handleClick = () => {
      const code = pre.querySelector('code');
      if (code) {
        navigator.clipboard
          .writeText(code.textContent || '')
          .then(() => onCopy('代码已复制'))
          .catch(() => onCopy('复制失败'));
      }
    };

    btn.addEventListener('click', handleClick);
    pre.appendChild(btn);
    cleanups.push(() => {
      btn.removeEventListener('click', handleClick);
      btn.remove();
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

export default function BlogPostView() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const notification = useNotificationStore();

  const [post, setPost] = useState<BlogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Highlight code blocks + setup copy buttons after content renders
  useEffect(() => {
    if (contentRef.current && post?.body) {
      hljs.highlightAll();
      const cleanup = setupCodeCopy(contentRef.current, (msg) =>
        notification.success(msg),
      );
      return cleanup;
    }
  }, [post?.body, notification]);

  const fetchPost = useCallback(async () => {
    if (!postId) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = blogService();
      const result = await service.getBlogPost(postId);
      setPost(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章失败');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return (
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <div className="bg-surface sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-accent flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <svg
              className="text-foreground h-5 w-5"
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
          <h1 className="text-foreground flex-1 truncate text-lg font-semibold">
            {post?.title || '文章'}
          </h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6"
          >
            <LoadingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6"
          >
            <ErrorState message={error} onRetry={fetchPost} />
          </motion.div>
        ) : post ? (
          <motion.article
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pb-20"
          >
            {/* Hero */}
            <div className="px-4 pt-4">
              {post.is_pinned && (
                <div className="bg-primary/15 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                  置顶文章
                </div>
              )}

              <h1 className="text-foreground text-2xl leading-tight font-bold">
                {post.title}
              </h1>

              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="from-primary to-primary/80 text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold">
                    A
                  </div>
                  <span>{post.category?.name || '未分类'}</span>
                </div>
                <span className="text-muted-foreground/50">|</span>
                <span>{formatDate(post.created_at)}</span>
                {post.updated_at !== post.created_at && (
                  <>
                    <span className="text-muted-foreground/50">|</span>
                    <span>更新于 {formatDate(post.updated_at)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="bg-muted my-4 h-px" />

            {/* Article Summary */}
            <ArticleSummaryCard
              title={post?.title}
              content={post?.body || ''}
            />

            {/* Content */}
            <div ref={contentRef} className="article-content max-w-none px-4">
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }}
              />
            </div>

            {/* Comments Section */}
            <TwikooComments path={postId} />
          </motion.article>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
