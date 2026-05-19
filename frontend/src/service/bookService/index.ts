import { bookGateway } from "@/api/bookGateway";

export const bookService = {
  async getBooks(params: { page?: number; per_page?: number }) {
    return bookGateway.getBooks(params);
  },

  async createBook(payload: {
    title: string;
    author: string;
    iscompleted: boolean;
  }) {
    return bookGateway.createBook(payload);
  },

  async updateBook(
    bookId: number,
    payload: { title: string; author: string; iscompleted: boolean },
  ) {
    return bookGateway.updateBook(bookId, payload);
  },

  async patchBookStatus(bookId: number, payload: { iscompleted: boolean }) {
    return bookGateway.patchBookStatus(bookId, payload);
  },

  async deleteBook(bookId: number) {
    return bookGateway.deleteBook(bookId);
  },

  async importBooks(payload: { weread_cookie: string }) {
    return bookGateway.importBooks(payload);
  },
};
