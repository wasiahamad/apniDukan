import { apiClient, type ApiResponse } from '../apiClient';

export type WalletTxnStatus = 'pending' | 'completed' | 'rejected';
export type WalletTxnType = 'credit' | 'debit';
export type WalletTxnSource = 'referral' | 'withdrawal';

export type AdminWalletUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  walletBalance?: number;
};

export type AdminWalletTransaction = {
  _id: string;
  user?: AdminWalletUser;
  amount: number;
  type: WalletTxnType;
  source: WalletTxnSource;
  status: WalletTxnStatus;
  referenceId?: string;
  createdAt: string;
};

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export type AdminWithdrawalRequest = {
  _id: string;
  user?: AdminWalletUser;
  amount: number;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
  };
  status: WithdrawalStatus;
  processedAt?: string;
  processedBy?: { _id: string; name?: string; email?: string };
  rejectionReason?: string;
  createdAt: string;
};

export type AdminWalletMetrics = {
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
};

export const walletAdminApi = {
  async getMetrics(): Promise<ApiResponse<AdminWalletMetrics>> {
    return apiClient.get<AdminWalletMetrics>('/wallet/admin/metrics', true);
  },

  async listWithdrawals(params?: { status?: WithdrawalStatus }): Promise<ApiResponse<AdminWithdrawalRequest[]>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<AdminWithdrawalRequest[]>(`/wallet/admin/withdrawals${suffix}`, true);
  },

  async approveWithdrawal(id: string): Promise<ApiResponse<AdminWithdrawalRequest>> {
    return apiClient.patch<AdminWithdrawalRequest>(`/wallet/admin/withdrawals/${encodeURIComponent(id)}/approve`, {}, true);
  },

  async rejectWithdrawal(id: string, reason?: string): Promise<ApiResponse<AdminWithdrawalRequest>> {
    return apiClient.patch<AdminWithdrawalRequest>(`/wallet/admin/withdrawals/${encodeURIComponent(id)}/reject`, { reason }, true);
  },

  async listTransactions(params?: { userId?: string }): Promise<ApiResponse<AdminWalletTransaction[]>> {
    const qs = new URLSearchParams();
    if (params?.userId) qs.set('userId', params.userId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<AdminWalletTransaction[]>(`/wallet/admin/transactions${suffix}`, true);
  },

  async listCustomers(params?: { search?: string }): Promise<ApiResponse<AdminWalletUser[]>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<AdminWalletUser[]>(`/wallet/admin/customers${suffix}`, true);
  },
};
