import request, { type ApiResponse } from '@/api/shared/request';

export interface WereadUserInfo {
  user_id: number;
  api_key: string;
}

export interface WereadUserBook {
  id?: string;
  user_id?: number;
  bookId: string;
  title: string;
  author: string;
  cover: string | null;
  category: string | null;
  isTop: boolean;
  readUpdateTime: number | null;
  updateTime: number | null;
  finishReading: boolean;
  secret: boolean;
  readProgress: WereadBookProgress | null;
  updated_at?: string;
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

// ── 原始类型（对应 backend weread_detail_raw.py）─────────────────────
// 四种 mode (weekly/monthly/annually/overall) 返回的字段逐级递增：
// - Weekly     → 基础统计 + rank
// - Monthly    → 同上 + preferCategory + readStat
// - Annually   → 同上 + preferAuthor + preferCp + preferPublisher + readRate/wrReadTime
// - Overall    → 同上 + preferTime + preferTimeWord + medals

export interface ReadDetailBook {
  bookId: string | null;
  title: string | null;
  author: string | null;
  translator: string | null;
  intro: string | null;
  cover: string | null;
}

export interface ReadDetailRawLongestItem {
  book: ReadDetailBook | null;
  albumInfo: Record<string, unknown> | null;
  readTime: number;
  tags: string[];
}

export interface ReadDetailRawRank {
  text: string;
  scheme: string;
}

export interface ReadDetailRawStat {
  stat: string;
  counts: string;
}

export interface ReadDetailRawAuthorItem {
  name: string | null;
  count: number | null;
  readTime: string | null;
}

export interface ReadDetailRawCategoryItem {
  categoryTitle: string;
  readingCount: number;
  readingTime: number;
}

export interface ReadDetailRawPublisherItem {
  name: string | null;
  count: number;
}

export interface ReadDetailRawCopyrightInfo {
  name: string;
  userVid: number;
  role: number;
  avatar: string;
  cpType: number;
}

// ── 四种 mode 的层级模型（与 Python raw models 1:1）──

export interface ReadDetailRawBase {
  user_id: number;
  mode: string;
  baseTime: number;
  fetched_at: string;
}

export interface ReadDetailWeeklyRaw extends ReadDetailRawBase {
  readTimes: Record<string, number> | null;
  readDays: number | null;
  readLongest: ReadDetailRawLongestItem[] | null;
  rank: ReadDetailRawRank | null;
  compare: number | null;
  dayAverageReadTime: number | null;
  totalReadTime: number | null;
}

export interface ReadDetailMonthlyRaw extends ReadDetailWeeklyRaw {
  preferCategory: ReadDetailRawCategoryItem[] | null;
  preferCategoryWord: string | null;
  readStat: ReadDetailRawStat[] | null;
}

export interface ReadDetailAnnuallyRaw extends ReadDetailMonthlyRaw {
  preferAuthor: ReadDetailRawAuthorItem[] | null;
  authorCount: number | null;
  preferPublisher: ReadDetailRawPublisherItem[] | null;
  readRate: number | null;
  wrReadTime: number | null;
  wrListenTime: number | null;
}

export interface ReadDetailOverallRaw extends ReadDetailAnnuallyRaw {
  preferTime: number[] | null;
  preferTimeWord: string | null;
}

/** 旧名称兼容 — 实际指向 mode-all 的 OverallRaw */
export type ReadDetailSnapshot = ReadDetailOverallRaw;

/** API 返回：按 mode 返回不同字段集 */
export type WereadReadProgressData =
  | ReadDetailWeeklyRaw
  | ReadDetailMonthlyRaw
  | ReadDetailAnnuallyRaw
  | ReadDetailOverallRaw;

/**
 * 阅读统计 mode 的唯一来源(运行时 + 类型)。
 *
 * 加新 mode 时:push 到这个数组,Record<ReadStatsMode, T> 仍需手动同步 4-mode 形状
 * (这是 issue 06 的工作,4 mode 下不划算)。
 */
export const READ_STATS_MODES = [
  'weekly',
  'monthly',
  'annually',
  'overall',
] as const;

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
  syncMyBooks(): Promise<ApiResponse<{ imported_count: number }>>;
  getReadProgress(
    mode: ReadStatsMode,
    baseTime?: number | null,
  ): Promise<ApiResponse<WereadReadProgressData>>;
  /** 年视图日历热力图:拉取指定年份每日的阅读时长(秒) */
  getYearlyHeatmap(year?: number): Promise<ApiResponse<WereadYearlyHeatmap>>;
  getBookProgress(
    bookId: string,
    refresh?: boolean,
  ): Promise<ApiResponse<WereadBookProgress | null>>;
  getBooksRecommend(
    count?: number,
    maxIdx?: number,
  ): Promise<ApiResponse<BookRecommendItem[]>>;
}

/** read-progress?perDay=true 的 data 形状 */
export interface WereadYearlyHeatmap {
  /** dayUnixSec(字符串) -> 秒;key 形如 "1704067200" */
  readTimes: Record<string, number>;
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

  async syncMyBooks(): Promise<ApiResponse<{ imported_count: number }>> {
    const res = await request.get<ApiResponse<{ imported_count: number }>>(
      'v2/weread/sync-my-books',
      { timeout: 60000 },
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

  async getYearlyHeatmap(
    year?: number,
  ): Promise<ApiResponse<WereadYearlyHeatmap>> {
    const params: Record<string, string | number | boolean> = {
      mode: 'annually',
      perDay: true,
    };
    if (year != null) params.year = year;
    const res = await request.get<ApiResponse<WereadYearlyHeatmap>>(
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
