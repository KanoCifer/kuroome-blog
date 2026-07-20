import request from '@/shared/api/request';

// ── 与 go-backend 对齐 —— 单一真源在后端（dto/fish.go + document/fishing_spot.go），前端镜像。 ──

const ApiVersion = 'v3';
const ApiUrlBase = `${ApiVersion}/fish/`;

/** 与 go-backend/internal/dto/fish.go:FishingSpotOut 对齐 */
export interface FishingSpot {
  id: string;
  name: string;
  description: string;
  /** [lng, lat] */
  location: [number, number];
  tags: string[];
  rating: number;
  images: string[];
  created_at: string;
  updated_at: string;
}

/**
 * 创建钓点载荷 —— 与 dto.FishingSpotIn 对齐。
 * Name / Location 必填（binding:"required"），其余可选。
 */
export interface CreateFishingSpotPayload {
  name: string;
  /** [lng, lat] */
  location: [number, number];
  description?: string;
  tags?: string[];
  rating?: number;
  images?: string[];
}

/**
 * 更新钓点载荷 —— 与 dto.FishingSpotUpdate 对齐。
 * 全字段可选：未传 = 不动，传了 = 显式覆盖（Partial update）。
 */
export type UpdateFishingSpotPayload = Partial<CreateFishingSpotPayload>;

/** 软删 / 物理删除选项 —— 与 handler DeleteFishingSpot ?hard=true 对齐 */
export interface DeleteFishingSpotOptions {
  /** true = 物理删除；省略 / false = 软删（设 DeletedAt） */
  hard?: boolean;
}

export interface FishingSpotsGateway {
  list(): Promise<FishingSpot[]>;
  getByID(id: string): Promise<FishingSpot>;
  create(payload: CreateFishingSpotPayload): Promise<void>;
  update(id: string, payload: UpdateFishingSpotPayload): Promise<void>;
  remove(id: string, options?: DeleteFishingSpotOptions): Promise<void>;
}

export const fishingSpotsGateway: FishingSpotsGateway = {
  async list(): Promise<FishingSpot[]> {
    const res = await request.get<{ data: FishingSpot[] }>(
      `${ApiUrlBase}spots`,
    );
    return res.data.data;
  },

  async getByID(id: string): Promise<FishingSpot> {
    const res = await request.get<{ data: FishingSpot }>(
      `${ApiUrlBase}spots/${id}`,
    );
    return res.data.data;
  },

  async create(payload: CreateFishingSpotPayload): Promise<void> {
    await request.post(`${ApiUrlBase}spots`, payload);
  },

  async update(id: string, payload: UpdateFishingSpotPayload): Promise<void> {
    await request.patch(`${ApiUrlBase}spots/${id}`, payload);
  },

  async remove(
    id: string,
    options: DeleteFishingSpotOptions = {},
  ): Promise<void> {
    await request.delete(`${ApiUrlBase}spots/${id}`, {
      params: { hard: options.hard ? 'true' : undefined },
    });
  },
};
