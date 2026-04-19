import { mapGateway } from "@/api/mapGateway";

export interface MapService {
  getSecurityKey(): Promise<{ securityJsCode: string }>;
}

export const mapService: MapService = {
  async getSecurityKey() {
    return mapGateway.getSecurityKey();
  },
};
