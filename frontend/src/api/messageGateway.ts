import request from '@/api/request';
import type { Comment, Message } from '@/types';

export interface MessageGateway {
  getMessages(): Promise<{ messages: Message[] }>;
  postMessage(payload: {
    name: string;
    message: string;
  }): Promise<{ _id: string }>;
  getAdminMessages(): Promise<{
    pending: Message[];
    approved: Message[];
  }>;
  approveAdminMessage(messageId: string): Promise<void>;
  deleteAdminMessage(messageId: string): Promise<void>;
  getAdminComments(): Promise<{
    pending: Comment[];
    approved: Comment[];
  }>;
  approveAdminComment(commentId: string): Promise<void>;
  deleteAdminComment(commentId: string): Promise<void>;
}

export const messageGateway: MessageGateway = {
  async getMessages(): Promise<{ messages: Message[] }> {
    const res = await request.get<{ data: { messages: Message[] } }>(
      'v1/messages',
    );
    return res.data.data;
  },

  async postMessage(payload: {
    name: string;
    message: string;
  }): Promise<{ _id: string }> {
    const res = await request.post<{ data: { _id: string } }>(
      'v1/messages',
      payload,
    );
    return res.data.data;
  },

  async getAdminMessages(): Promise<{
    pending: Message[];
    approved: Message[];
  }> {
    const res = await request.get<{
      data: { pending: Message[]; approved: Message[] };
    }>('v1/admin/messages');
    return res.data.data;
  },

  async approveAdminMessage(messageId: string): Promise<void> {
    await request.post(`v1/admin/messages/${messageId}/approve`);
  },

  async deleteAdminMessage(messageId: string): Promise<void> {
    await request.delete(`v1/admin/messages/${messageId}/delete`);
  },

  async getAdminComments(): Promise<{
    pending: Comment[];
    approved: Comment[];
  }> {
    const res = await request.get<{
      data: { pending: Comment[]; approved: Comment[] };
    }>('v1/admin/comments');
    return res.data.data;
  },

  async approveAdminComment(commentId: string): Promise<void> {
    await request.post(`v1/admin/comments/${commentId}/approve`);
  },

  async deleteAdminComment(commentId: string): Promise<void> {
    await request.delete(`v1/admin/comments/${commentId}/delete`);
  },
};
