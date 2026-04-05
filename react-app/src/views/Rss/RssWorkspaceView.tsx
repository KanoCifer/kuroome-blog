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
      if (Array.isArray(parsed)) setRssHistory(parsed.slice(0, 3));
    } catch {
      localStorage.removeItem('rssHistory');
    }
  }, []);

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
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
    <div className="min-h-dvh bg-gray-50 pb-28 dark:bg-slate-950">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="ml-12 max-w-2xl px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rss工作台
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Rss相关功能
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-slate-800"
        >
          <input
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm dark:border-slate-700"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSaveToDb((v) => !v)}
              className="rounded-full border border-blue-300 px-3 py-1 text-xs"
            >
              {saveToDb ? '已启用保存' : '保存到订阅'}
            </button>
            <button
              type="button"
              onClick={handleParse}
              disabled={parseLoading}
              className="ml-auto rounded-full bg-blue-600 px-3 py-1 text-xs text-white"
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
                className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 dark:bg-slate-800 dark:text-blue-300"
              >
                {feed.name}
              </button>
            ))}
            {rssHistory.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRssUrl(item)}
                className="max-w-56 truncate rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-slate-800"
              >
                {item}
              </button>
            ))}
          </div>
          {parseMetadata ? (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {parseMetadata.title} · {formatDate(parseMetadata.published)}
            </p>
          ) : null}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-slate-800"
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
            <p className="text-xs text-gray-500">加载中...</p>
          ) : (
            <ul className="space-y-2">
              {subscriptions.map((sub) => (
                <li
                  key={sub.id}
                  className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800"
                >
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
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white"
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
          className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="relative mb-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文章..."
              className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() =>
                void fetchArticles(1, selectedFeedUrl, searchQuery)
              }
              className="absolute top-1 right-1 rounded-md px-2 py-1 text-xs text-blue-600"
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
                className="text-xs text-gray-500"
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
                  <li
                    key={article.id}
                    className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800"
                  >
                    <Link
                      to={`/rss/articles/${article.id}`}
                      className="text-sm font-semibold text-gray-900 dark:text-white"
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
