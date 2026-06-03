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

export interface WereadGateway {
  saveUserInfo(apiKey: string): Promise<ApiResponse<null>>;
  getUserShelf(): Promise<ApiResponse<WereadShelfData>>;
  getBookInfo(bookId: string): Promise<ApiResponse<WereadBookDetail>>;
  syncMyBooks(): Promise<ApiResponse<{ imported_count: number }>>;
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
};
