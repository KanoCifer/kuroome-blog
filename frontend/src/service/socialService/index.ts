import request from "@/api/request";

export const socialService = {
  async getLikes() {
    return request("/likes");
  },

  async likeOnce(payload: { likescounts: number }) {
    return request.post("/like", payload);
  },
};
