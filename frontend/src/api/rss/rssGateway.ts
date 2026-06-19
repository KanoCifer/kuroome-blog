import request from '@/api/shared/request';
import type {
  RssArticle,
  RssArticleListResponse,
  RssSubscription,
} from '@/types';

export interface ParseRssPayload {
  rss_url: string;
  save_to_db: boolean;
}

export interface ParseRssResponse {
  meta: {
    title: string;
    link: string;
    description: string;
    published: string | null;
  };
  entries: RssEntry[];
}

export interface RssEntry {
  title: string;
  link: string;
  published: string | null;
  summary: string;
  content: string;
  id: string;
  author: string | null;
}

export interface RefreshResult {
  subscription_id: number;
  rss_url: string;
  saved_count: number;
}

export interface SubscriptionItem {
  id: number;
  rssUrl: string;
  feedTitle: string | null;
  feedLink: string | null;
  feedDescription: string | null;
  feedPublishedAt: string | null;
  entryCount: number;
  lastFetchedAt: string | null;
  createdAt: string | null;
}

export interface RssGateway {
  parseRss(payload: ParseRssPayload): Promise<ParseRssResponse>;
  getArticles(params: {
    page?: number;
    limit?: number;
    feed_url?: string;
    search?: string;
  }): Promise<RssArticleListResponse>;
  getArticle(articleId: string): Promise<RssArticle>;
  getSubscriptions(): Promise<SubscriptionItem[]>;
  refreshSubscription(subscriptionId: number): Promise<RefreshResult>;
  deleteSubscription(subscriptionId: number): Promise<void>;
  markArticleRead(articleId: string): Promise<void>;
  markArticleUnread(articleId: string): Promise<void>;
}

export const rssGateway: RssGateway = {
  async parseRss(payload: ParseRssPayload): Promise<ParseRssResponse> {
    const res = await request.post<{ data: ParseRssResponse }>(
      'v1/rss/parse-rss',
      payload,
    );
    return res.data.data;
  },

  async getArticles(params: {
    page?: number;
    limit?: number;
    feed_url?: string;
    search?: string;
  }): Promise<RssArticleListResponse> {
    const res = await request.get<{ data: RssArticleListResponse }>(
      'v1/rss/articles',
      { params },
    );
    return res.data.data;
  },

  async getArticle(articleId: string): Promise<RssArticle> {
    const res = await request.get<{ data: RssArticle }>(
      `v1/rss/articles/${articleId}`,
    );
    return res.data.data;
  },

  async getSubscriptions(): Promise<SubscriptionItem[]> {
    const res = await request.get<{ data: RssSubscription[] }>(
      'v1/rss/subscriptions',
    );
    return res.data.data.map((sub) => ({
      id: sub.id,
      rssUrl: sub.rss_url,
      feedTitle: sub.feed_title ?? null,
      feedLink: sub.feed_link ?? null,
      feedDescription: sub.feed_description ?? null,
      feedPublishedAt: sub.feed_published_at ?? null,
      entryCount: sub.entry_count ?? 0,
      lastFetchedAt: sub.last_fetched_at ?? null,
      createdAt: sub.created_at ?? null,
    }));
  },

  async refreshSubscription(subscriptionId: number): Promise<RefreshResult> {
    const res = await request.post<{ data: RefreshResult }>(
      `v1/rss/subscriptions/${subscriptionId}/refresh`,
    );
    return res.data.data;
  },

  async deleteSubscription(subscriptionId: number): Promise<void> {
    await request.delete(`v1/rss/subscriptions/${subscriptionId}`);
  },

  async markArticleRead(articleId: string): Promise<void> {
    await request.post(`v1/rss/articles/${articleId}/read`);
  },

  async markArticleUnread(articleId: string): Promise<void> {
    await request.delete(`v1/rss/articles/${articleId}/read`);
  },
};
