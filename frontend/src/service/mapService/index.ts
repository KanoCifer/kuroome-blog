import { mapGateway } from "@/api/mapGateway";

export interface MapService {
  getSecurityKey(): Promise<{ key: string }>;
}

export const mapService: MapService = {
  async getSecurityKey() {
    return mapGateway.getSecurityKey();
  },
};
