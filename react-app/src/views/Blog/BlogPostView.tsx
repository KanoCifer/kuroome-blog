import { ArticleSummaryCard } from '@/components/basic/ArticleSummary';
import { BackToTop } from '@/components/basic/BackToTop';
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
    <div className="border-border bg-background animate-pulse space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
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
        className="bg-destructive/90 hover:bg-destructive active:scale-[0.96] mt-4 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all duration-150"
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

/**
 * 阅读统计：剥离 markdown 标记后，分别计中文字符与西文词数，
 * 按 400 字/分钟（中文）+ 200 词/分钟（西文）估算阅读时长。
 * 不编造指标——无正文时返回 1 分钟 / 0 字。
 */
function readingStats(body: string): { minutes: number; count: number } {
  if (!body) return { minutes: 1, count: 0 };
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~]/g, ' ')
    .replace(/\s+/g, ' ');
  const cjk = (plain.match(/[一-鿿]/g) || []).length;
  const words = (plain.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const count = cjk + words;
  const minutes = Math.max(1, Math.round(cjk / 400 + words / 200));
  return { minutes, count };
}

/** 顶部阅读进度条：跟随窗口滚动，scaleX 0→1。 */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div className="bg-border/50 fixed inset-x-0 top-0 z-30 h-[2px] overflow-hidden">
      <div
        className="bg-primary h-full origin-left transition-[width] duration-150 ease-out will-change-[width]"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
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

  const stats = post?.body ? readingStats(post.body) : { minutes: 1, count: 0 };
  const hasUpdate =
    !!post?.updated_at &&
    !!post?.created_at &&
    post.updated_at !== post.created_at;

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

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => notification.success('链接已复制'))
      .catch(() => notification.error('复制失败'));
  };

  return (
    <div className="bg-background min-h-dvh">
      <ReadingProgress />

      {/* Header */}
      <div className="bg-surface/90 sticky top-0 z-20 border-b border-border/40 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))]">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-muted active:scale-[0.96] flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-150"
            aria-label="返回"
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
          <h1 className="text-foreground flex-1 truncate text-base font-medium">
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
            className="mx-auto w-full max-w-md px-[max(1.25rem,env(safe-area-inset-left))] pt-6 pr-[max(1.25rem,env(safe-area-inset-right))]"
          >
            <LoadingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-md px-[max(1.25rem,env(safe-area-inset-left))] pt-6 pr-[max(1.25rem,env(safe-area-inset-right))]"
          >
            <ErrorState message={error} onRetry={fetchPost} />
          </motion.div>
        ) : post ? (
          <motion.article
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-md px-[max(1.25rem,env(safe-area-inset-left))] pb-24 pr-[max(1.25rem,env(safe-area-inset-right))]"
          >
            {/* Admin actions */}
            {showEditButton && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => navigate(`/blog/edit/${post._id}`)}
                  className="bg-muted text-foreground hover:bg-muted/80 active:scale-[0.96] inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
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
                  className="bg-destructive/10 text-destructive hover:bg-destructive/15 active:scale-[0.96] inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
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

            {/* Article header — editorial */}
            <header className="pt-8">
              {/* Eyebrow / kicker */}
              <div className="text-primary mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span className="bg-primary h-px w-5" />
                {post.category?.name || '未分类'}
              </div>

              {/* Headline */}
              <h1
                data-od-id="headline"
                className="text-foreground text-[1.875rem] leading-[1.18] font-semibold tracking-[-0.01em] sm:text-[2.125rem]"
              >
                {post.title}
              </h1>

              {/* Deck / standfirst — 阅读时长 + 字数，作为引言式元信息 */}
              <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed tabular-nums">
                约 {stats.minutes} 分钟阅读 · {stats.count.toLocaleString()} 字
              </p>

              {/* Byline / dateline */}
              <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs tracking-wide">
                <time dateTime={post.created_at}>
                  {post.created_at ? formatDate(post.created_at, 'YYYY-MM-DD') : '未知日期'}
                </time>
                {hasUpdate && (
                  <>
                    <span className="bg-border h-3 w-px" />
                    <span>
                      更新于 {formatDate(post.updated_at!, 'YYYY-MM-DD')}
                    </span>
                  </>
                )}
              </div>
            </header>

            {/* Hero image + caption */}
            {post.cover && (
              <figure className="mt-7">
                <div className="border-border bg-muted aspect-[16/9] overflow-hidden rounded-xl border">
                  <img
                    src={coverSrc}
                    alt={`${post.title} 封面`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                  />
                </div>
                <figcaption className="text-muted-foreground mt-2 text-[11px] tracking-[0.04em]">
                  封面 · {post.category?.name || 'ReadingList'}
                </figcaption>
              </figure>
            )}

            {/* Content */}
            <div className="mt-9">
              {/* Article Summary */}
              <ArticleSummaryCard title={post?.title} content={post?.body || ''} />

              {/* Markdown body */}
              <div ref={contentRef} className="prose prose-lg mt-7 max-w-none">
                {renderedBodyWithOrigin ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderedBodyWithOrigin,
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">暂无内容</p>
                )}
              </div>
            </div>

            {/* Article footer — 复制链接 + 更新时间 */}
            <footer className="mt-12 border-t border-border/60 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs tracking-wide">
                  {hasUpdate
                    ? `最后更新于 ${formatDate(post.updated_at!, 'YYYY-MM-DD')}`
                    : post.created_at
                      ? `发布于 ${formatDate(post.created_at, 'YYYY-MM-DD')}`
                      : ''}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="text-muted-foreground hover:text-primary active:scale-[0.96] inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium tracking-wide transition-all duration-150"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    />
                  </svg>
                  复制链接
                </button>
              </div>
            </footer>

            {/* Comments */}
            <div className="mt-10">
              <TwikooComments path={`/blog/${postId}`} />
            </div>
          </motion.article>
        ) : null}
      </AnimatePresence>

      <BackToTop className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]" />

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-foreground/80 fixed inset-0 backdrop-blur-sm"
            onClick={() => setShowDeleteDialog(false)}
          />
          <div className="bg-background border-border relative w-full max-w-sm rounded-2xl border p-6 shadow-lg">
            <h3 className="text-foreground text-lg font-semibold">确认删除</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              确定要删除这篇文章吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="bg-muted text-foreground hover:bg-muted/80 active:scale-[0.96] rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90 active:scale-[0.96] rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-150"
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
