import request from '@/api/request';

export interface Message {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface MessageGateway {
  getMessages(): Promise<Message[]>;
  postMessage(payload: { name: string; message: string }): Promise<Message>;
  getAdminMessages(): Promise<Message[]>;
  approveAdminMessage(messageId: string): Promise<void>;
  deleteAdminMessage(messageId: string): Promise<void>;
  getAdminComments(): Promise<Comment[]>;
  approveAdminComment(commentId: string): Promise<void>;
  deleteAdminComment(commentId: string): Promise<void>;
}

export const messageGateway: MessageGateway = {
  async getMessages() {
    const res = await request.get<{ data: Message[] }>('v1/messages');
    return res.data.data;
  },

  async postMessage(payload) {
    const res = await request.post<{ data: Message }>('v1/messages', payload);
    return res.data.data;
  },

  async getAdminMessages() {
    const res = await request.get<{ data: Message[] }>('v1/admin/messages');
    return res.data.data;
  },

  async approveAdminMessage(messageId) {
    await request.post(`v1/admin/messages/${messageId}/approve`);
  },

  async deleteAdminMessage(messageId) {
    await request.delete(`v1/admin/messages/${messageId}/delete`);
  },

  async getAdminComments() {
    const res = await request.get<{ data: Comment[] }>('v1/admin/comments');
    return res.data.data;
  },

  async approveAdminComment(commentId) {
    await request.post(`v1/admin/comments/${commentId}/approve`);
  },

  async deleteAdminComment(commentId) {
    await request.delete(`v1/admin/comments/${commentId}/delete`);
  },
};
