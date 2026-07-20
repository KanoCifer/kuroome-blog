// RSS 文章与订阅类型

export interface RssArticle {
  id: string;
  guid: string;
  feed_url: string;
  title: string;
  link: string;
  summary: string;
  content: string;
  author: string | null;
  published: string | null;
  fetched_at: string;
  is_read: boolean;
}

export interface RssSubscription {
  id: number;
  rss_url: string;
  feed_title?: string | null;
  feed_link?: string | null;
  feed_description?: string | null;
  feed_published_at?: string | null;
  entry_count?: number;
  last_fetched_at?: string | null;
  created_at: string | null;
}

export interface RssArticleListResponse {
  items: RssArticle[];
  total: number;
  page: number;
  limit: number;
}
