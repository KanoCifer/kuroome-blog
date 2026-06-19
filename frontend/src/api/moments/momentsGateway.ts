import request from '@/api/shared/request';
import type {
  Moment,
  MomentCreatePayload,
  MomentListResponse,
  MomentStatus,
  MomentUpdatePayload,
} from '@/types';

export interface ListPublicMomentsParams {
  page?: number;
  page_size?: number;
  tag?: string;
}

export interface ListAdminMomentsParams {
  page?: number;
  page_size?: number;
  status?: MomentStatus;
}

export interface MomentsGateway {
  listPublic(params?: ListPublicMomentsParams): Promise<MomentListResponse>;
  listAdmin(params?: ListAdminMomentsParams): Promise<MomentListResponse>;
  get(id: string): Promise<{ moment: Moment }>;
  getAdmin(id: string): Promise<{ moment: Moment }>;
  create(payload: MomentCreatePayload): Promise<{ moment: Moment }>;
  update(id: string, payload: MomentUpdatePayload): Promise<{ moment: Moment }>;
  remove(id: string): Promise<void>;
}

export const momentsGateway: MomentsGateway = {
  async listPublic(params) {
    const res = await request.get<{ data: MomentListResponse }>('v1/moments', {
      params,
    });
    return res.data.data;
  },

  async listAdmin(params) {
    const res = await request.get<{ data: MomentListResponse }>(
      'v1/moments/admin',
      { params },
    );
    return res.data.data;
  },

  async get(id) {
    const res = await request.get<{ data: { moment: Moment } }>(
      `v1/moments/${id}`,
    );
    return res.data.data;
  },

  async getAdmin(id) {
    const res = await request.get<{ data: { moment: Moment } }>(
      `v1/moments/admin/${id}`,
    );
    return res.data.data;
  },

  async create(payload) {
    const res = await request.post<{ data: { moment: Moment } }>(
      'v1/moments',
      payload,
    );
    return res.data.data;
  },

  async update(id, payload) {
    const res = await request.patch<{ data: { moment: Moment } }>(
      `v1/moments/${id}`,
      payload,
    );
    return res.data.data;
  },

  async remove(id) {
    await request.delete(`v1/moments/${id}`);
  },
};
