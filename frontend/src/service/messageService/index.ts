import request from '@/api/request';

export const messageService = {
  async getMessages() {
    return request.get('/messages');
  },

  async postMessage(payload: { name: string; message: string }) {
    return request.post('/messages', payload);
  },

  async getAdminMessages() {
    return request.get('/admin/messages');
  },

  async approveAdminMessage(messageId: string) {
    return request.post(`/admin/messages/${messageId}/approve`);
  },

  async deleteAdminMessage(messageId: string) {
    return request.delete(`/admin/messages/${messageId}/delete`);
  },

  async getAdminComments() {
    return request.get('/admin/comments');
  },

  async approveAdminComment(commentId: string) {
    return request.post(`/admin/comments/${commentId}/approve`);
  },

  async deleteAdminComment(commentId: string) {
    return request.delete(`/admin/comments/${commentId}/delete`);
  },
};
