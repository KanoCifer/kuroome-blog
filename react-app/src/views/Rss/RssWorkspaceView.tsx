import { rssService, type SubscriptionItem } from '@/services/rssService';
import { useNotificationStore } from '@/stores/notificationState';
import type { RssArticle } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Rss } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const ARTICLE_LIMIT = 20;

export default function RssWorkspaceView() {
  const notifier = useNotificationStore();
  const service = useMemo(() => rssService(), []);

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [selectedFeedUrl, setSelectedFeedUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [showFeedPicker, setShowFeedPicker] = useState(false);

  const totalPages = useMemo(
    () => Math.ceil(totalItems / ARTICLE_LIMIT),
    [totalItems],
  );

  const selectedFeed = subscriptions.find(
    (sub) => sub.rssUrl === selectedFeedUrl,
  );

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const subs = await service.getSubscriptions();
      setSubscriptions(subs);
      if (subs.length > 0 && !selectedFeedUrl) {
        setSelectedFeedUrl(subs[0].rssUrl);
      }
    } catch (err) {
      notifier.error(err instanceof Error ? err.message : '加载订阅失败');
    } finally {
      setLoadingSubs(false);
    }
  }, [notifier, service, selectedFeedUrl]);

  const fetchArticles = useCallback(
    async (page: number, feedUrl: string) => {
      setLoadingArticles(true);
      try {
        const response = await service.getArticles({
          page,
          limit: ARTICLE_LIMIT,
          feed_url: feedUrl || undefined,
        });
        setArticles(response.items);
        setTotalItems(response.total);
        setCurrentPage(response.page);
      } catch (err) {
        notifier.error(err instanceof Error ? err.message : '加载文章失败');
      } finally {
        setLoadingArticles(false);
      }
    },
    [notifier, service],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchArticles(currentPage, selectedFeedUrl);
  }, [currentPage, fetchArticles, selectedFeedUrl]);

  const handleSelectFeed = (feedUrl: string) => {
    setSelectedFeedUrl(feedUrl);
    setCurrentPage(1);
    setShowFeedPicker(false);
  };

  return (
    <div className="bg-background min-h-dvh pb-28">
      {/* Header */}
      <header className="bg-background/85 sticky top-0 z-10 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          <Rss className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-lg font-bold">RSS 阅读</h1>

          {/* Feed selector */}
          {subscriptions.length > 1 && (
            <button
              type="button"
              onClick={() => setShowFeedPicker((v) => !v)}
              className="border-border bg-background hover:bg-muted ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="max-w-32 truncate">
                {selectedFeed?.feedTitle || '全部'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Feed picker dropdown */}
        <AnimatePresence>
          {showFeedPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-border/60 overflow-hidden border-t"
            >
              <div className="bg-background/95 mx-auto w-full max-w-md px-4 py-2">
                <button
                  type="button"
                  onClick={() => handleSelectFeed('')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                    !selectedFeedUrl
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  全部订阅
                </button>
                {subscriptions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectFeed(sub.rssUrl)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedFeedUrl === sub.rssUrl
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {sub.feedTitle || new URL(sub.rssUrl).hostname}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Article list */}
      <main className="mx-auto w-full max-w-md px-4 pt-3">
        {loadingSubs ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-14 rounded-xl" />
              </div>
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <Rss className="text-muted-foreground/40 mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-sm">暂无订阅源</p>
            <p className="text-muted-foreground/60 mt-1 text-xs">
              在管理后台添加 RSS 订阅后即可阅读
            </p>
          </div>
        ) : loadingArticles ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-muted-foreground pt-16 text-center text-sm">
            暂无文章
          </p>
        ) : (
          <div className="space-y-3">
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Link
                  to={`/rss/articles/${article.id}`}
                  className="bg-background border-border/60 hover:bg-muted/50 block rounded-2xl border p-4 transition-colors active:scale-[0.99]"
                >
                  <h2 className="text-foreground text-[15px] leading-snug font-semibold">
                    {article.title || '无标题'}
                  </h2>
                  {article.summary && (
                    <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm leading-relaxed">
                      {article.summary}
                    </p>
                  )}
                  <div className="text-muted-foreground/70 mt-2.5 flex items-center gap-2 text-xs">
                    {article.author && <span>{article.author}</span>}
                    {article.author && article.published && (
                      <span className="bg-muted-foreground/40 h-1 w-1 rounded-full" />
                    )}
                    {article.published && (
                      <span>{formatDate(article.published)}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-6 text-sm">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="border-border text-foreground disabled:text-muted-foreground flex items-center gap-1 rounded-full border px-4 py-2 font-medium transition-colors disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-muted-foreground text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="border-border text-foreground disabled:text-muted-foreground flex items-center gap-1 rounded-full border px-4 py-2 font-medium transition-colors disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
