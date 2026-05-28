import request from '@/api/request';
import type { AxiosResponse } from 'axios';

export interface AuthGateway {
  uploadAvatar(formData: FormData): Promise<AxiosResponse<any>>;
  getPasskeyRegistrationOptions(): Promise<AxiosResponse<any>>;
  registerPasskey(payload: { response: unknown }): Promise<AxiosResponse<any>>;
  deletePasskey(): Promise<AxiosResponse<any>>;
  unbindGithub(): Promise<AxiosResponse<any>>;
  updateProfileSettings(payload: {
    name: string;
    username: string;
    gender: string | null;
    email: string | null;
    mobile: string | null;
    password: string | null;
  }): Promise<AxiosResponse<any>>;
  sendRegisterEmailCode(payload: {
    email: string;
  }): Promise<AxiosResponse<any>>;
  register(payload: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    email_code: string;
  }): Promise<AxiosResponse<any>>;
}

export const authGateway: AuthGateway = {
  async uploadAvatar(formData: FormData) {
    return request.put('v1/auth/upload-pic', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getPasskeyRegistrationOptions() {
    return request.get('v1/auth/passkey/registration-options');
  },

  async registerPasskey(payload: { response: unknown }) {
    return request.post('v1/auth/passkey/register', payload);
  },

  async deletePasskey() {
    return request.delete('v1/auth/passkey/delete');
  },

  async unbindGithub() {
    return request.post('v1/auth/github/unbind');
  },

  async updateProfileSettings(payload) {
    return request.put('v1/auth/settings', payload);
  },

  async sendRegisterEmailCode(payload: { email: string }) {
    return request.post('v1/auth/email/code', payload);
  },

  async register(payload) {
    return request.post('v1/auth/register', payload);
  },
};
