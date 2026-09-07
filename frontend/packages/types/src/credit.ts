// ── 积分（credits）相关类型 ────────────────────────────────────────────────
//
// 镜像后端 go-backend/internal/dto/credit.go 的对外视图；
// 字段统一 snake_case，与后端 JSON 一致；金额单位"分"（float64），
// 厘制整型只在后端内部流转。

import type { Pagination } from './common';

/** GET /v3/credits/balance 响应。无钱包行时返回 0。 */
export interface CreditBalanceResponse {
  /** 余额（分） */
  balance: number;
  /** 历史累计净消耗（分），退款冲减 */
  total_spent: number;
}

/** 单条流水的对外视图（厘 → 分）。Meta 由后端 base64 JSON 解析成对象。 */
export interface CreditTransactionView {
  id: number;
  source: string;
  biz_id: string;
  /** grant / consume / refund */
  type: string;
  /** 分，正入负出 */
  amount: number;
  /** 分 */
  balance_after: number;
  meta?: Record<string, unknown>;
  created_at: string;
}

/** GET /v3/credits/transactions 响应，分页信封对齐 EventsResponse。 */
export interface CreditTransactionsResponse {
  items: CreditTransactionView[];
  pagination: Pagination;
}

/** POST /v3/admin/credits/grant 请求体。
 *  user_id 与 email 二选一（都给时后端 user_id 优先；都不给 → 400）。 */
export interface GrantCreditRequest {
  user_id?: number;
  email?: string;
  /** 分，支持两位小数 */
  amount: number;
  /** 可选幂等键；缺省服务端生成 UUID */
  biz_id?: string;
}
