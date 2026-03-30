import { apiClient, type ApiResponse } from '../apiClient';

export type AdminRevenueByWeek = { week: string; revenue: number };

export type AdminRevenueSummary = {
  totalRevenueAllTime: number;
  paidInvoicesAllTime: number;
  revenueLast4Weeks: number;
  paidInvoicesLast4Weeks: number;
  revenuePrev4Weeks: number;
  paidInvoicesPrev4Weeks: number;
  trendPct: number | null;
  revenueByWeek: AdminRevenueByWeek[];
};

export const paymentsAdminApi = {
  async getRevenueSummary(): Promise<ApiResponse<AdminRevenueSummary>> {
    return apiClient.get<AdminRevenueSummary>('/payments/admin/revenue', true);
  },
};
