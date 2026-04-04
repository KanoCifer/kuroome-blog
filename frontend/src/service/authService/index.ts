import request from "@/api/request";

export const authService = {
  async uploadAvatar(formData: FormData) {
    return request.put("/auth/upload-pic", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  async getPasskeyRegistrationOptions() {
    return request.get("/auth/passkey/registration-options");
  },

  async registerPasskey(payload: { response: unknown }) {
    return request.post("/auth/passkey/register", payload);
  },

  async deletePasskey() {
    return request.delete("/auth/passkey/delete");
  },

  async unbindGithub() {
    return request.post("/auth/github/unbind");
  },

  async updateProfileSettings(payload: {
    name: string;
    username: string;
    gender: string | null;
    email: string | null;
    mobile: string | null;
    password: string | null;
  }) {
    return request.put("/auth/settings", payload);
  },

  async sendRegisterEmailCode(payload: { email: string }) {
    return request.post("/auth/email/code", payload);
  },

  async register(payload: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    email_code: string;
  }) {
    return request.post("/auth/register", payload);
  },
};
