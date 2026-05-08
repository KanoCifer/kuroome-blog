import request from "@/api/request";
import type { BookListResponse } from "@/types";

export const bookService = {
  async getBooks(params: { page?: number; per_page?: number }) {
    return request.get<BookListResponse>("/book", { params });
  },

  async createBook(payload: {
    title: string;
    author: string;
    iscompleted: boolean;
  }) {
    return request.post("/books/addbook", payload);
  },

  async updateBook(
    bookId: number,
    payload: { title: string; author: string; iscompleted: boolean },
  ) {
    return request.put(`/books/${bookId}`, payload);
  },

  async patchBookStatus(bookId: number, payload: { iscompleted: boolean }) {
    return request.patch(`/books/${bookId}/status`, payload);
  },

  async deleteBook(bookId: number) {
    return request.delete(`/books/${bookId}`);
  },

  async importBooks(payload: { weread_cookie: string }) {
    return request.post("/import", payload);
  },
};
