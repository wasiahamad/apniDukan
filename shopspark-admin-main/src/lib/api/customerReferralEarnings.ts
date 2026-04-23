import { apiClient, type ApiResponse } from '../apiClient';

export type CustomerReferralStatus = 'pending' | 'active' | 'rewarded';

export type CustomerReferralUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  walletBalance?: number;
};

export type CustomerReferralPlan = {
  _id: string;
  name?: string;
  slug?: string;
  price?: number;
};

export type AdminCustomerReferralRow = {
  _id: string;
  status: CustomerReferralStatus;
  commissionEarned: number;
  createdAt: string;
  rewardedAt?: string;
  referrer?: CustomerReferralUser;
  referredUser?: CustomerReferralUser;
  planId?: CustomerReferralPlan | string | null;
};

export type AdminCustomerReferralMetrics = {
  totalReferrals: number;
  totalEarningsPaid: number;
};

export type CustomerReferralOfferStatus = 'draft' | 'active' | 'closed' | 'archived';

export type CustomerReferralOffer = {
  _id: string;
  offerName: string;
  description?: string;
  commissionPercent: number;
  status: CustomerReferralOfferStatus;
  validFrom?: string;
  validUntil?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCustomerReferralOfferInput = {
  offerName: string;
  description?: string;
  commissionPercent: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
};

export const customerReferralAdminApi = {
  async getMetrics(): Promise<ApiResponse<AdminCustomerReferralMetrics>> {
    return apiClient.get<AdminCustomerReferralMetrics>('/customer-referrals/admin/metrics', true);
  },

  async list(params?: { status?: CustomerReferralStatus }): Promise<ApiResponse<AdminCustomerReferralRow[]>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get<AdminCustomerReferralRow[]>(`/customer-referrals/admin${suffix}`, true);
  },

  // Offers (commission %)
  async listOffers(): Promise<ApiResponse<CustomerReferralOffer[]>> {
    return apiClient.get<CustomerReferralOffer[]>('/customer-referrals/admin/offers', true);
  },

  async createOffer(input: CreateCustomerReferralOfferInput): Promise<ApiResponse<CustomerReferralOffer>> {
    return apiClient.post<CustomerReferralOffer>('/customer-referrals/admin/offers', input, true);
  },

  async updateOffer(id: string, input: Partial<CreateCustomerReferralOfferInput> & { status?: CustomerReferralOfferStatus }): Promise<ApiResponse<CustomerReferralOffer>> {
    return apiClient.put<CustomerReferralOffer>(`/customer-referrals/admin/offers/${id}`, input, true);
  },

  async activateOffer(id: string): Promise<ApiResponse<CustomerReferralOffer>> {
    return apiClient.put<CustomerReferralOffer>(`/customer-referrals/admin/offers/${id}/activate`, {}, true);
  },

  async closeOffer(id: string): Promise<ApiResponse<CustomerReferralOffer>> {
    return apiClient.put<CustomerReferralOffer>(`/customer-referrals/admin/offers/${id}/close`, {}, true);
  },
};
