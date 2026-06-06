import { wereadGateway } from '@/api/wereadGateway';

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

  async getReadProgress(refresh = false) {
    return wereadGateway.getReadProgress(refresh);
  },
};
