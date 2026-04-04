import request from "@/api/request";

export const weatherService = {
  async getTide() {
    return request.get("/qweather/tide");
  },

  async reverseGeocode(payload: { location: string; extensions: "base" | "all" }) {
    return request.post("/geocode/regeo", payload);
  },

  async getWeather(payload: { city: string; extensions: "base" | "all" }) {
    return request.post("/weather", payload);
  },
};
