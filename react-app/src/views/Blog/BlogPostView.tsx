import { ArticleSummaryCard } from '@/components/basic/ArticleSummary';
import type { BlogDetail } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import { TwikooComments } from '@/components/blog/TwikooComments';
import { useAuthStore } from '@/stores/authState';
import { useNotificationStore } from '@/stores/notificationState';
import { formatDate } from '@/utils/formatdate';
import { useOrigin } from '@/hooks/useOrigin';
import { AnimatePresence, motion } from 'framer-motion';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github.css';
import { marked } from 'marked';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function LoadingSkeleton() {
  return (
    <div className="border-border bg-card animate-pulse space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
      <div className="space-y-4">
        <div className="bg-muted h-8 w-3/4 rounded-lg" />
        <div className="bg-muted h-4 w-1/4 rounded" />
      </div>
      <div className="bg-border/60 h-1 w-16" />
      <div className="space-y-3">
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-5/6 rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-4/5 rounded" />
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
    <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="text-destructive mb-4 h-12 w-12"
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
      <p className="text-destructive text-lg font-medium">加载失败</p>
      <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="bg-destructive/90 hover:bg-destructive mt-4 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-transform active:scale-95"
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
      'absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-muted cursor-pointer';
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
  const { user, isAuthenticated } = useAuthStore();

  const [post, setPost] = useState<BlogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const showEditButton = isAuthenticated && user?.is_admin;

  // SEO: set document title
  useEffect(() => {
    if (post?.title) {
      document.title = `${post.title} - ReadingList`;
    }
    return () => {
      document.title = 'ReadingList';
    };
  }, [post?.title]);

  // Render markdown to HTML
  const renderedBody = post?.body
    ? (marked.parse(post.body, { async: false, breaks: false }) as string)
    : '';

  // 非 http(s) 开头的 src 用 https://api.kanocifer.chat 作为前缀（仅在 https 环境下生效）
  const coverSrc = post?.cover ? useOrigin(post.cover) : '';

  // 渲染正文中所有 <img src="...">，非 http(s) 开头的补上前缀
  const renderedBodyWithOrigin = renderedBody
    ? renderedBody.replace(
        /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
        (_match, pre: string, src: string, postAttr: string) =>
          `<img ${pre}src="${useOrigin(src)}"${postAttr}>`,
      )
    : '';

  // Highlight code blocks + setup copy buttons after content renders
  useEffect(() => {
    if (contentRef.current && renderedBody) {
      hljs.highlightAll();
      const cleanup = setupCodeCopy(contentRef.current, (msg) =>
        notification.success(msg),
      );
      return cleanup;
    }
  }, [renderedBody, notification]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!postId) return;
    setShowDeleteDialog(false);
    try {
      const service = blogService();
      await service.deleteLegacyPost(postId);
      notification.success('文章删除成功');
      navigate('/blog');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除文章失败';
      notification.error(msg);
    }
  };

  return (
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <div className="bg-surface sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-muted flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
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
            className="px-5 pt-5"
          >
            <LoadingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 pt-5"
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
            {/* Admin actions */}
            {showEditButton && (
              <div className="flex items-center justify-end gap-2 px-5 pt-4">
                <button
                  onClick={() => navigate(`/blog/edit/${post._id}`)}
                  className="bg-muted text-foreground hover:bg-muted/80 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  编辑
                </button>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/15 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  删除
                </button>
              </div>
            )}

            {/* Hero */}
            <div className="px-5 pt-4">
              {post.cover && (
                <div className="border-border bg-muted mb-5 aspect-[16/9] overflow-hidden rounded-2xl border">
                  <img
                    src={coverSrc}
                    alt={`${post.title} 封面`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

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

              <h1 className="text-foreground text-2xl leading-tight font-bold sm:text-3xl">
                {post.title}
              </h1>

              <div className="text-primary mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  {post.category?.name || '未分类'}
                </div>
                {post.created_at && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    {formatDate(post.created_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="bg-muted mx-5 my-4 h-px" />

            {/* Content card */}
            <div className="border-border bg-card mx-5 overflow-hidden rounded-2xl border shadow-sm">
              <div className="p-5 sm:p-8">
                {/* Article Summary */}
                <ArticleSummaryCard
                  title={post?.title}
                  content={post?.body || ''}
                />

                {/* Markdown body */}
                <div
                  ref={contentRef}
                  className="prose prose-lg max-w-none"
                >
                  {renderedBodyWithOrigin ? (
                    <div dangerouslySetInnerHTML={{ __html: renderedBodyWithOrigin }} />
                  ) : (
                    <p className="text-muted-foreground italic">暂无内容</p>
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="px-5 pt-5">
              <TwikooComments path={`/blog/${postId}`} />
            </div>
          </motion.article>
        ) : null}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/80 fixed inset-0 backdrop-blur-sm"
            onClick={() => setShowDeleteDialog(false)}
          />
          <div className="bg-card border-border relative w-full max-w-sm rounded-2xl border p-6 shadow-lg">
            <h3 className="text-foreground text-lg font-semibold">确认删除</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              确定要删除这篇文章吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="bg-muted text-foreground hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
