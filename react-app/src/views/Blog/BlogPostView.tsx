import { ArticleSummaryCard } from '@/components/basic/ArticleSummary';
import type { BlogDetail } from '@/services/blogService';
import { blogService } from '@/services/blogService';
import type { Comment } from '@/types';
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

function CommentItem({
  comment,
  depth = 0,
  onReply,
}: {
  comment: Comment;
  depth?: number;
  onReply: (comment: Comment) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-4 border-l-2 border-gray-100 pl-4 dark:border-gray-800' : ''}`}
    >
      <div className="py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-500 text-sm font-bold text-white">
            {comment.author?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {comment.author}
              </span>
              {comment.from_admin && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  博主
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onReply(comment)}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            回复
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {comment.body}
        </p>
        {comment.comments && comment.comments.length > 0 && (
          <div className="mt-2">
            {comment.comments.map((reply: Comment) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting,
  placeholder = '写下你的评论...',
  initialValue = '',
}: {
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  initialValue?: string;
}) {
  const [body, setBody] = useState(initialValue);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
      />
      <div className="mt-3 flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            取消
          </button>
        )}
        <button
          onClick={() => {
            if (body.trim()) {
              onSubmit(body);
              setBody('');
            }
          }}
          disabled={!body.trim() || isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '发布中...' : '发布评论'}
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-4">
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
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
    <div className="mx-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-8 text-center dark:border-red-800/50 dark:bg-red-900/20">
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
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-red-700 active:scale-95"
      >
        重试
      </button>
    </div>
  );
}

export default function BlogPostView() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Highlight code blocks after content renders
  useEffect(() => {
    if (contentRef.current && post?.body) {
      hljs.highlightAll();
    }
  }, [post?.body]);

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

  const handleSubmitComment = async (body: string) => {
    if (!postId || !body.trim()) return;

    setIsSubmitting(true);

    try {
      const service = blogService();
      await service.postComment({
        post_id: postId,
        body: body.trim(),
        author: '匿名用户',
        reply_to: replyTo?._id,
        reply_to_author: replyTo?.author,
      });
      setReplyTo(null);
      await fetchPost();
    } catch (err) {
      alert(err instanceof Error ? err.message : '评论失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const flatComments = (comments: Comment[]): Comment[] => {
    const flat: Comment[] = [];
    const flatten = (list: Comment[]) => {
      list.forEach((c) => {
        flat.push(c);
        if (c.comments && c.comments.length > 0) {
          flatten(c.comments);
        }
      });
    };
    flatten(comments);
    return flat;
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-800"
          >
            <svg
              className="h-5 w-5 text-gray-700 dark:text-gray-300"
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
          <h1 className="flex-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
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
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
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

              <h1 className="text-2xl leading-tight font-bold text-gray-900 dark:text-white">
                {post.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-500 text-xs font-bold text-white">
                    A
                  </div>
                  <span>{post.category?.name || '未分类'}</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{formatDate(post.created_at)}</span>
                {post.updated_at !== post.created_at && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span>更新于 {formatDate(post.updated_at)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />

            {/* Article Summary */}
            <ArticleSummaryCard
              title={post?.title}
              content={post?.body || ''}
            />

            {/* Content */}
            <div
              ref={contentRef}
              className="prose prose-sm dark:prose-invert max-w-none px-4"
            >
              <div
                className="leading-relaxed text-gray-700 dark:text-gray-300 [&_a]:text-blue-600 [&_a]:underline [&_h1]:text-xl [&_h1,&_h2,&_h3,&_h4]:font-bold [&_h2]:text-lg [&_h3]:text-base [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }}
              />
            </div>

            {/* Comments Section */}
            <div className="mx-4 mt-8 rounded-2xl bg-white p-4 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                评论 ({flatComments(post.comments || []).length})
              </h2>

              {/* Comment Form */}
              <div className="mt-4">
                {replyTo ? (
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>回复 @</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {replyTo.author}
                    </span>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="ml-auto rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      取消
                    </button>
                  </div>
                ) : null}
                <CommentForm
                  onSubmit={handleSubmitComment}
                  onCancel={replyTo ? () => setReplyTo(null) : undefined}
                  isSubmitting={isSubmitting}
                  placeholder={
                    replyTo ? `回复 @${replyTo.author}...` : '写下你的评论...'
                  }
                />
              </div>

              {/* Comments List */}
              {post.comments && post.comments.length > 0 ? (
                <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                  {post.comments.map((comment) => (
                    <CommentItem
                      key={comment._id}
                      comment={comment}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 text-center text-sm text-gray-400">
                  暂无评论，来发表第一条评论吧
                </div>
              )}
            </div>
          </motion.article>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
