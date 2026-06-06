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
  isTop: boolean;
  readUpdateTime: string | null;
  finishReading: boolean;
  secret: boolean;
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

export interface WereadReadProgressData {
  snapshots: ReadDetailSnapshot[];
}

export interface WereadGateway {
  saveUserInfo(apiKey: string): Promise<ApiResponse<null>>;
  getUserShelf(): Promise<ApiResponse<WereadShelfData>>;
  getBookInfo(bookId: string): Promise<ApiResponse<WereadBookDetail>>;
  syncMyBooks(): Promise<ApiResponse<{ imported_count: number }>>;
  getReadProgress(refresh?: boolean): Promise<ApiResponse<WereadReadProgressData>>;
}

export const wereadGateway: WereadGateway = {
  async saveUserInfo(apiKey: string): Promise<ApiResponse<null>> {
    const res = await request.post<ApiResponse<null>>(
      'v2/weread/user-info',
      { api_key: apiKey },
    );
    return res.data;
  },

  async getUserShelf(): Promise<ApiResponse<WereadShelfData>> {
    const res = await request.get<ApiResponse<WereadShelfData>>(
      'v2/weread/bookshelf',
    );
    return res.data;
  },

  async getBookInfo(
    bookId: string,
  ): Promise<ApiResponse<WereadBookDetail>> {
    const res = await request.get<ApiResponse<WereadBookDetail>>(
      `v2/weread/book/${bookId}`,
    );
    return res.data;
  },

  async syncMyBooks(): Promise<
    ApiResponse<{ imported_count: number }>
  > {
    const res = await request.get<ApiResponse<{ imported_count: number }>>(
      'v2/weread/sync-my-books',
    );
    return res.data;
  },

  async getReadProgress(
    refresh = false,
  ): Promise<ApiResponse<WereadReadProgressData>> {
    const res = await request.get<ApiResponse<WereadReadProgressData>>(
      'v2/weread/read-progress',
      { params: { refresh } },
    );
    return res.data;
  },
};
