import request from "@/api/request";
import type { BookListResponse } from "@/types";

export interface BookGateway {
  getBooks(params: {
    page?: number;
    per_page?: number;
  }): Promise<BookListResponse>;
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
  ): Promise<void>;
  deleteBook(bookId: number): Promise<void>;
  importBooks(payload: { weread_cookie: string }): Promise<void>;
}

export const bookGateway: BookGateway = {
  async getBooks(params) {
    const res = await request.get<{ data: BookListResponse }>("v1/books", {
      params,
    });
    return res.data.data;
  },

  async createBook(payload) {
    await request.post("v1/books/addbook", payload);
  },

  async updateBook(bookId, payload) {
    await request.put(`v1/books/${bookId}`, payload);
  },

  async patchBookStatus(bookId, payload) {
    await request.patch(`v1/books/${bookId}/status`, payload);
  },

  async deleteBook(bookId) {
    await request.delete(`v1/books/${bookId}`);
  },

  async importBooks(payload) {
    await request.post("v1/import", payload);
  },
};
