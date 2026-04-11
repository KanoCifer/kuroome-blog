import request, { extractData } from '@/api/request';
import type { BookItem, BookListData } from '@/types';

function isBookItem(data: unknown): data is BookItem {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as Partial<BookItem>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.iscompleted === 'boolean'
  );
}

export interface BookService {
  getBooks(params: { page?: number; per_page?: number }): Promise<BookListData>;
  createBook(payload: {
    title: string;
    author: string;
    iscompleted: boolean;
  }): Promise<void>;
  updateBook(
    bookId: number,
    payload: { title: string; author: string; iscompleted: boolean },
  ): Promise<void>;
  patchBookStatus(
    bookId: number,
    payload: { iscompleted: boolean },
  ): Promise<BookItem | null>;
  deleteBook(bookId: number): Promise<void>;
  importBooks(payload: { weread_cookie: string }): Promise<number>;
}

export const bookService = (): BookService => ({
  async getBooks(params: { page?: number; per_page?: number }) {
    const res = await request.get('v1/book', { params });
    const data = extractData(res) as BookListData | undefined;
    return (
      data ?? {
        books: [],
        pagination: {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 1,
          has_prev: false,
          has_next: false,
          prev_num: null,
          next_num: null,
        },
      }
    );
  },

  async createBook(payload) {
    await request.post('v1/books/addbook', payload);
  },

  async updateBook(bookId, payload) {
    await request.put(`v1/books/${bookId}`, payload);
  },

  async patchBookStatus(bookId, payload) {
    const res = await request.patch(`v1/books/${bookId}/status`, payload);
    const data = extractData(res) as unknown;
    if (!data) return null;
    if (isBookItem(data)) {
      return data;
    }
    if (typeof data === 'object' && data !== null && 'book' in data) {
      const nested = (data as { book?: unknown }).book;
      return isBookItem(nested) ? nested : null;
    }
    return null;
  },

  async deleteBook(bookId) {
    await request.delete(`v1/books/${bookId}`);
  },

  async importBooks(payload) {
    const res = await request.post('v1/import', payload);
    const data = extractData(res) as { imported_count?: number } | undefined;
    return data?.imported_count ?? 0;
  },
});
