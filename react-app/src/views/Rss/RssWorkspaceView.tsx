import { rssService, type SubscriptionItem } from '@/services/rssService';
import { useNotificationStore } from '@/stores/notificationState';
import type { RssArticle } from '@/types';
import { formatDate } from '@/utils/formatdate';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

interface ParseMetadata {
  title: string;
  description: string;
  link: string;
  published: string | null;
}

const EXAMPLE_FEEDS = [
  { name: '少数派', url: 'https://sspai.com/feed' },
  { name: 'GitHub', url: 'https://github.com/blog.atom' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
];

const ARTICLE_LIMIT = 20;

function getFeedHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function RssWorkspaceView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const notifier = useNotificationStore();
  const service = useMemo(() => rssService(), []);

  const [rssUrl, setRssUrl] = useState('');
  const [saveToDb, setSaveToDb] = useState(false);
  const [rssHistory, setRssHistory] = useState<string[]>([]);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseMetadata, setParseMetadata] = useState<ParseMetadata | null>(
    null,
  );
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || '',
  );
  const [selectedFeedUrl, setSelectedFeedUrl] = useState(
    searchParams.get('feed_url') || '',
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1,
  );
  const [totalItems, setTotalItems] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);

  const totalPages = useMemo(
    () => Math.ceil(totalItems / ARTICLE_LIMIT),
    [totalItems],
  );

  const syncRouteQuery = useCallback(
    (page: number, feedUrl: string, search: string) => {
      const next = new URLSearchParams();
      if (page > 1) next.set('page', String(page));
      if (feedUrl.trim()) next.set('feed_url', feedUrl.trim());
      if (search.trim()) next.set('search', search.trim());
      setSearchParams(next);
    },
    [setSearchParams],
  );

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      setSubscriptions(await service.getSubscriptions());
    } catch (err) {
      notifier.error(err instanceof Error ? err.message : '加载订阅失败');
    } finally {
      setLoadingSubs(false);
    }
  }, [notifier, service]);

  const fetchArticles = useCallback(
    async (page: number, feedUrl: string, search: string) => {
      setLoadingArticles(true);
      try {
        const response = await service.getArticles({
          page,
          limit: ARTICLE_LIMIT,
          feed_url: feedUrl || undefined,
          search: search || undefined,
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
    const history = localStorage.getItem('rssHistory');
    if (!history) return;
    try {
      const parsed = JSON.parse(history) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(parsed)) setRssHistory(parsed.slice(0, 3));
    } catch {
      localStorage.removeItem('rssHistory');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchArticles(currentPage, selectedFeedUrl, searchQuery);
  }, [currentPage, fetchArticles, searchQuery, selectedFeedUrl]);

  const handleParse = async () => {
    const target = rssUrl.trim();
    if (!target) {
      notifier.error('请输入 RSS 订阅地址');
      return;
    }
    setParseLoading(true);
    const merged = [target, ...rssHistory.filter((v) => v !== target)].slice(
      0,
      3,
    );
    setRssHistory(merged);
    localStorage.setItem('rssHistory', JSON.stringify(merged));
    try {
      const parsed = await service.parseRss(target, saveToDb);
      setParseMetadata(parsed.meta);
      notifier.success('RSS 解析成功');
      if (saveToDb) {
        await fetchSubscriptions();
        await fetchArticles(1, selectedFeedUrl, searchQuery);
      }
    } catch (err) {
      notifier.error(err instanceof Error ? err.message : '解析失败');
    } finally {
      setParseLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-dvh pb-28">
      <header className="bg-background/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="ml-12 max-w-2xl px-4 py-4">
          <h1 className="text-foreground text-2xl font-bold">Rss工作台</h1>
          <p className="text-muted-foreground mt-1 text-sm">Rss相关功能</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background ring-border rounded-2xl p-4 ring-1"
        >
          <input
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="border-border w-full rounded-xl border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSaveToDb((v) => !v)}
              className="border-primary rounded-full border px-3 py-1 text-xs"
            >
              {saveToDb ? '已启用保存' : '保存到订阅'}
            </button>
            <button
              type="button"
              onClick={handleParse}
              disabled={parseLoading}
              className="bg-primary text-primary-foreground ml-auto rounded-full px-3 py-1 text-xs"
            >
              {parseLoading ? '解析中...' : '开始解析'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_FEEDS.map((feed) => (
              <button
                key={feed.url}
                type="button"
                onClick={() => setRssUrl(feed.url)}
                className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs"
              >
                {feed.name}
              </button>
            ))}
            {rssHistory.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRssUrl(item)}
                className="bg-secondary max-w-56 truncate rounded-full px-3 py-1 text-xs"
              >
                {item}
              </button>
            ))}
          </div>
          {parseMetadata ? (
            <p className="text-muted-foreground mt-3 text-xs">
              {parseMetadata.title} · {formatDate(parseMetadata.published)}
            </p>
          ) : null}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-background ring-border rounded-2xl p-4 ring-1"
        >
          <div className="mb-2 flex items-center">
            <h2 className="text-sm font-semibold">我的订阅</h2>
            <button
              type="button"
              onClick={() => void fetchSubscriptions()}
              className="ml-auto rounded-full border px-3 py-1 text-xs"
            >
              刷新
            </button>
          </div>
          {loadingSubs ? (
            <p className="text-muted-foreground text-xs">加载中...</p>
          ) : (
            <ul className="space-y-2">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="bg-secondary rounded-xl p-3">
                  <p className="truncate text-sm font-medium">
                    {sub.feedTitle || getFeedHost(sub.rssUrl)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFeedUrl(sub.rssUrl);
                        syncRouteQuery(1, sub.rssUrl, searchQuery);
                        void fetchArticles(1, sub.rssUrl, searchQuery);
                      }}
                      className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                    >
                      查看文章
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="bg-background ring-border rounded-2xl p-4 ring-1"
        >
          <div className="relative mb-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章..."
              className="border-border w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                void fetchArticles(1, selectedFeedUrl, searchQuery)
              }
              className="text-primary absolute top-1 right-1 rounded-md px-2 py-1 text-xs"
            >
              搜索
            </button>
          </div>
          <AnimatePresence mode="wait">
            {loadingArticles ? (
              <motion.p
                key="l"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground text-xs"
              >
                加载中...
              </motion.p>
            ) : (
              <motion.ul
                key="a"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {articles.map((article) => (
                  <li key={article.id} className="bg-secondary rounded-xl p-3">
                    <Link
                      to={`/rss/articles/${article.id}`}
                      className="text-foreground text-sm font-semibold"
                    >
                      {article.title || '无标题'}
                    </Link>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          {totalPages > 1 ? (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  void fetchArticles(
                    currentPage - 1,
                    selectedFeedUrl,
                    searchQuery,
                  )
                }
                disabled={currentPage <= 1}
              >
                上一页
              </button>
              <span>
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  void fetchArticles(
                    currentPage + 1,
                    selectedFeedUrl,
                    searchQuery,
                  )
                }
                disabled={currentPage >= totalPages}
              >
                下一页
              </button>
            </div>
          ) : null}
        </motion.section>
      </main>
    </div>
  );
}
