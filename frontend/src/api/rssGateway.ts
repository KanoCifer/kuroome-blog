import request from "@/api/request";
import type { RssArticle, RssArticleListResponse, RssSubscription } from "@/types";

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

export interface RssGateway {
  parseRss(payload: ParseRssPayload): Promise<ParseRssResponse>;
  getArticles(params: {
    page?: number;
    limit?: number;
    feed_url?: string;
    search?: string;
  }): Promise<RssArticleListResponse>;
  getArticle(articleId: string): Promise<RssArticle>;
  getSubscriptions(): Promise<RssSubscription[]>;
  refreshSubscription(subscriptionId: number): Promise<RefreshResult>;
  deleteSubscription(subscriptionId: number): Promise<void>;
  markArticleRead(articleId: string): Promise<void>;
  markArticleUnread(articleId: string): Promise<void>;
}

export const rssGateway: RssGateway = {
  async parseRss(payload: ParseRssPayload): Promise<ParseRssResponse> {
    const res = await request.post<{ data: ParseRssResponse }>("/rss/parse-rss", payload);
    return res.data.data;
  },

  async getArticles(params: {
    page?: number;
    limit?: number;
    feed_url?: string;
    search?: string;
  }): Promise<RssArticleListResponse> {
    const res = await request.get<{ data: RssArticleListResponse }>("/rss/articles", { params });
    return res.data.data;
  },

  async getArticle(articleId: string): Promise<RssArticle> {
    const res = await request.get<{ data: RssArticle }>(`/rss/articles/${articleId}`);
    return res.data.data;
  },

  async getSubscriptions(): Promise<RssSubscription[]> {
    const res = await request.get<{ data: RssSubscription[] }>("/rss/subscriptions");
    return res.data.data;
  },

  async refreshSubscription(subscriptionId: number): Promise<RefreshResult> {
    const res = await request.post<{ data: RefreshResult }>(`/rss/subscriptions/${subscriptionId}/refresh`);
    return res.data.data;
  },

  async deleteSubscription(subscriptionId: number): Promise<void> {
    await request.delete(`/rss/subscriptions/${subscriptionId}`);
  },

  async markArticleRead(articleId: string): Promise<void> {
    await request.post(`/rss/articles/${articleId}/read`);
  },

  async markArticleUnread(articleId: string): Promise<void> {
    await request.delete(`/rss/articles/${articleId}/read`);
  },
};
