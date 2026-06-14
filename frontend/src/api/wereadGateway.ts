import request, { type ApiResponse } from '@/api/request';

export interface WereadUserInfo {
  user_id: number;
  api_key: string;
}

export interface WereadUserBook {
  id: string;
  user_id: number;
  bookId: string;
  title: string;
  author: string;
  cover: string | null;
  isTop: boolean;
  readUpdateTime: string | null;
  finishReading: boolean;
  secret: boolean;
  readProgress: WereadBookProgress | null;
  updated_at: string;
}

export interface WereadArchive {
  id: string;
  user_id: number;
  bookIds: (string | null)[];
  albumIds: (string | null)[];
  name: string;
}

export interface WereadBookDetail {
  id: string;
  bookId: string;
  title: string;
  author: string;
  translator: string | null;
  cover: string | null;
  introduction: string | null;
  category: string | null;
  publisher: string | null;
  publishTime: string | null;
  isbn: string | null;
  wordCount: number | null;
  newRating: number | null;
  newRatingCount: number | null;
  newRatingDetails: Record<string, unknown> | null;
  fetched_at: string;
}

export interface WereadShelfData {
  user_books: WereadUserBook[];
  archives: WereadArchive[];
}

export interface ReadLongestItem {
  bookId: string | null;
  title: string | null;
  author: string | null;
  cover: string | null;
  readTime: number;
  tags: string[];
}

export interface ReadStatItem {
  label: string;
  value: number;
}

export interface PreferCategoryItem {
  categoryTitle: string;
  readingTime: number;
  readingCount: number;
}

export interface PreferAuthorItem {
  authorId: number | null;
  name: string | null;
  readingTime: string | null;
}

export interface PreferPublisherItem {
  name: string | null;
  count: number;
}

export interface ReadDetailSnapshot {
  user_id: number;
  mode: string;
  baseTime: number;
  fetched_at: string;
  totalReadTime: number | null;
  readDays: number | null;
  dayAverageReadTime: number | null;
  compare: number | null;
  readRate: number | null;
  wrReadTime: number | null;
  wrListenTime: number | null;
  readTimes: Record<string, number> | null;
  readLongest: ReadLongestItem[] | null;
  readStat: ReadStatItem[] | null;
  preferCategory: PreferCategoryItem[] | null;
  preferTime: number[] | null;
  preferAuthor: PreferAuthorItem[] | null;
  preferPublisher: PreferPublisherItem[] | null;
}

export interface WereadReadProgressData extends ReadDetailSnapshot {}

/**
 * 阅读统计 mode 的唯一来源(运行时 + 类型)。
 *
 * 加新 mode 时:push 到这个数组,Record<ReadStatsMode, T> 仍需手动同步 4-mode 形状
 * (这是 issue 06 的工作,4 mode 下不划算)。
 */
export const READ_STATS_MODES = ['weekly', 'monthly', 'annually', 'overall'] as const;

export type ReadStatsMode = (typeof READ_STATS_MODES)[number];

export interface WereadBookProgress {
  chapterUid: number | null;
  chapterOffset: number | null;
  progress: number | null;
  updateTime: number | null;
  readingTime: number;
  finishTime: number | null;
  isStartReading: string | null;
}

export interface BookRecommendItem {
  bookId: string;
  title: string;
  author: string;
  cover: string | null;
  reason: string;
  readingCount: number;
  searchIdx: number;
  newRating: number; // 0-100
  intro: string | null;
  category: string | null;
}

export interface WereadGateway {
  saveUserInfo(apiKey: string): Promise<ApiResponse<null>>;
  getUserShelf(): Promise<ApiResponse<WereadShelfData>>;
  getBookInfo(bookId: string): Promise<ApiResponse<WereadBookDetail>>;
  syncMyBooks(
    force?: boolean,
  ): Promise<ApiResponse<{ imported_count: number }>>;
  getReadProgress(
    mode: ReadStatsMode,
    baseTime?: number | null,
  ): Promise<ApiResponse<WereadReadProgressData>>;
  getBookProgress(
    bookId: string,
    refresh?: boolean,
  ): Promise<ApiResponse<WereadBookProgress | null>>;
  getBooksRecommend(
    count?: number,
    maxIdx?: number,
  ): Promise<ApiResponse<BookRecommendItem[]>>;
}

export const wereadGateway: WereadGateway = {
  async saveUserInfo(apiKey: string): Promise<ApiResponse<null>> {
    const res = await request.post<ApiResponse<null>>('v2/weread/user-info', {
      api_key: apiKey,
    });
    return res.data;
  },

  async getUserShelf(): Promise<ApiResponse<WereadShelfData>> {
    const res = await request.get<ApiResponse<WereadShelfData>>(
      'v2/weread/bookshelf',
    );
    return res.data;
  },

  async getBookInfo(bookId: string): Promise<ApiResponse<WereadBookDetail>> {
    const res = await request.get<ApiResponse<WereadBookDetail>>(
      `v2/weread/book/${bookId}`,
    );
    return res.data;
  },

  async syncMyBooks(
    force = false,
  ): Promise<ApiResponse<{ imported_count: number }>> {
    const res = await request.get<ApiResponse<{ imported_count: number }>>(
      'v2/weread/sync-my-books',
      { timeout: 60000, params: { force } },
    );
    return res.data;
  },

  async getReadProgress(
    mode: ReadStatsMode,
    baseTime?: number | null,
  ): Promise<ApiResponse<WereadReadProgressData>> {
    const params: Record<string, string | number> = { mode };
    if (baseTime != null && mode !== 'overall') params.baseTime = baseTime;
    const res = await request.get<ApiResponse<WereadReadProgressData>>(
      'v2/weread/read-progress',
      { params },
    );
    return res.data;
  },

  async getBookProgress(
    bookId: string,
    refresh = false,
  ): Promise<ApiResponse<WereadBookProgress | null>> {
    const res = await request.get<ApiResponse<WereadBookProgress | null>>(
      `v2/weread/book/${bookId}/progress`,
      { params: { refresh } },
    );
    return res.data;
  },

  async getBooksRecommend(
    count = 12,
    maxIdx = 0,
  ): Promise<ApiResponse<BookRecommendItem[]>> {
    const res = await request.get<ApiResponse<BookRecommendItem[]>>(
      'v2/weread/books-recommend',
      { params: { count, maxIdx } },
    );
    return res.data;
  },
};
