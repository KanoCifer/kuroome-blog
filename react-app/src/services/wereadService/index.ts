import { wereadGateway, type ReadStatsMode } from '@/api/wereadGateway';

export const wereadService = {
  async saveUserInfo(apiKey: string) {
    return wereadGateway.saveUserInfo(apiKey);
  },

  async getUserShelf() {
    return wereadGateway.getUserShelf();
  },

  async getBookInfo(bookId: string) {
    return wereadGateway.getBookInfo(bookId);
  },

  async syncMyBooks(force = false) {
    return wereadGateway.syncMyBooks(force);
  },

  async getReadProgress(mode: ReadStatsMode, baseTime?: number | null) {
    return wereadGateway.getReadProgress(mode, baseTime);
  },

  async getBookProgress(bookId: string, refresh = false) {
    return wereadGateway.getBookProgress(bookId, refresh);
  },

  async getBooksRecommend(count = 12, maxIdx = 0) {
    return wereadGateway.getBooksRecommend(count, maxIdx);
  },
};
