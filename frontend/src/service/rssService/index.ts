import { rssGateway, type RefreshResult } from '@/api/rssGateway';
import type { RssArticle, RssArticleListResponse } from '@/types';

// 解析 RSS 响应
export interface ParsedRssFeed {
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

// 订阅列表项（处理后的）
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

export interface RssService {
  parseRss(payload: {
    rss_url: string;
    save_to_db: boolean;
  }): Promise<ParsedRssFeed>;
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

export const rssService: RssService = {
  async parseRss(payload: {
    rss_url: string;
    save_to_db: boolean;
  }): Promise<ParsedRssFeed> {
    return rssGateway.parseRss(payload);
  },

  async getArticles(params: {
    page?: number;
    limit?: number;
    feed_url?: string;
    search?: string;
  }): Promise<RssArticleListResponse> {
    return rssGateway.getArticles(params);
  },

  async getArticle(articleId: string): Promise<RssArticle> {
    return rssGateway.getArticle(articleId);
  },

  async getSubscriptions(): Promise<SubscriptionItem[]> {
    const subs = await rssGateway.getSubscriptions();
    return subs.map((sub) => ({
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
    return rssGateway.refreshSubscription(subscriptionId);
  },

  async deleteSubscription(subscriptionId: number): Promise<void> {
    await rssGateway.deleteSubscription(subscriptionId);
  },

  async markArticleRead(articleId: string): Promise<void> {
    await rssGateway.markArticleRead(articleId);
  },

  async markArticleUnread(articleId: string): Promise<void> {
    await rssGateway.markArticleUnread(articleId);
  },
};
