import { rssService } from '@/services/rssService';
import { useNotificationStore } from '@/stores/notificationState';
import type { RssArticle } from '@/types';
import { formatDate } from '@/utils/formatdate';
import DOMPurify from 'dompurify';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function rewriteImageUrls(html: string, base: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (!src) return;
    let resolved = src;
    try {
      resolved = new URL(src, base).toString();
    } catch {
      resolved = src;
    }
    img.setAttribute(
      'src',
      `/api/v1/rss/image-proxy?url=${encodeURIComponent(resolved)}`,
    );
  });
  return doc.body.innerHTML;
}

export default function RssArticleView() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const notifier = useNotificationStore();
  const service = useMemo(() => rssService(), []);

  const [article, setArticle] = useState<RssArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    setError(null);
    try {
      setArticle(await service.getArticle(articleId));
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载文章失败';
      setError(message);
      notifier.error(message);
    } finally {
      setLoading(false);
    }
  }, [articleId, notifier, service]);

  useEffect(() => {
    void fetchArticle();
  }, [fetchArticle]);

  const html = useMemo(() => {
    const raw = article?.content || article?.summary || '';
    const base = article?.link || article?.feed_url || window.location.origin;
    return DOMPurify.sanitize(rewriteImageUrls(raw, base));
  }, [article]);

  return (
    <div className="min-h-dvh bg-gray-50 pb-28 dark:bg-slate-950">
      <header className="sticky top-0 z-10 bg-white/85 px-4 py-3 backdrop-blur-md dark:bg-slate-900/85">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full px-3 py-1 text-sm"
        >
          返回
        </button>
      </header>
      <main className="mx-auto w-full max-w-dvw px-4 py-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.p
              key="l"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              加载中...
            </motion.p>
          ) : error ? (
            <motion.p
              key="e"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-600"
            >
              {error}
            </motion.p>
          ) : article ? (
            <motion.article
              key="c"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {article.title}
              </h1>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {article.author ? `作者：${article.author} · ` : ''}
                {formatDate(article.published)}
              </p>
              <div
                className="prose prose-sm mt-4 max-w-none rounded-2xl bg-white p-4 ring-1 ring-blue-100 dark:prose-invert dark:bg-slate-900 dark:ring-slate-800"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </motion.article>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
