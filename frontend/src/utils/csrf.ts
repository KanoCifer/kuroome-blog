import request from "@/request";

export async function initCSRF() {
  await request.get("/auth/csrf-token");
}
