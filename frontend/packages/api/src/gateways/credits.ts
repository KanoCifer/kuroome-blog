// 积分端点 gateway。三个接口都走用户 JWT（grant / admin 查询额外要求 admin
// 白名单，由后端 AdminMiddleware 强制），不另走 service-token。
//
// 端点契约见 go-backend/internal/handler/credit_handler.go：32-45。
import { apiClient, extractData } from '../apiClient';
import type { ApiResponse } from '../types';
import type {
  CreditBalanceResponse,
  CreditTransactionsResponse,
  CreditTransactionView,
  GrantCreditRequest,
} from '@readinglist/types';

/** admin 查询定位符：email 与 user_id 二选一；都给时后端 user_id 优先。 */
export interface AdminCreditTarget {
  email?: string;
  user_id?: number;
}

/** GET /v3/admin/credits/transactions 查询参数（定位符 + 分页）。 */
export interface AdminCreditTxQuery extends AdminCreditTarget {
  page: number;
  per_page: number;
}

export interface CreditsGateway {
  /** POST /v3/admin/credits/grant — 管理员给目标用户发放积分。 */
  grant: (payload: GrantCreditRequest) => Promise<CreditTransactionView>;
  /** GET /v3/credits/transactions — 当前登录用户的积分流水分页。 */
  listTransactions: (
    page: number,
    perPage: number,
  ) => Promise<CreditTransactionsResponse>;
  /** GET /v3/credits/balance — 当前登录用户余额。 */
  getBalance: () => Promise<CreditBalanceResponse>;
  /** GET /v3/admin/credits/balance — 管理员按 email / user_id 查任意用户余额。 */
  getBalanceFor: (target: AdminCreditTarget) => Promise<CreditBalanceResponse>;
  /** GET /v3/admin/credits/transactions — 管理员按 email / user_id 查任意用户流水。 */
  listTransactionsFor: (
    query: AdminCreditTxQuery,
  ) => Promise<CreditTransactionsResponse>;
}

export const creditsGateway: CreditsGateway = {
  grant(payload) {
    return apiClient
      .post<ApiResponse<CreditTransactionView>>(
        'v3/admin/credits/grant',
        payload,
      )
      .then(extractData);
  },

  listTransactions(page, perPage) {
    return apiClient
      .get<ApiResponse<CreditTransactionsResponse>>('v3/credits/transactions', {
        params: { page, per_page: perPage },
      })
      .then(extractData);
  },

  getBalance() {
    return apiClient
      .get<ApiResponse<CreditBalanceResponse>>('v3/credits/balance')
      .then(extractData);
  },

  getBalanceFor(target) {
    return apiClient
      .get<ApiResponse<CreditBalanceResponse>>('v3/admin/credits/balance', {
        params: target,
      })
      .then(extractData);
  },

  listTransactionsFor(query) {
    return apiClient
      .get<ApiResponse<CreditTransactionsResponse>>(
        'v3/admin/credits/transactions',
        { params: query },
      )
      .then(extractData);
  },
};
