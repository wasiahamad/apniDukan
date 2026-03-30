import { apiClient, type ApiResponse } from '../apiClient';

export interface ReferralOffer {
  _id: string;
  offerName: string;
  description?: string;
  referralThreshold: number;
  rewardPlan: string;
  rewardDuration: number;
  firstTimeOnly: boolean;
  requiresFirstPaidPlan: boolean;
  validFrom?: string;
  validUntil?: string;
  terms?: string;
  autoApprove: boolean;
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
}

export interface RewardRequest {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  offer: {
    _id: string;
    offerName: string;
    referralThreshold: number;
    rewardPlan: string;
    rewardDuration: number;
  };
  requestNumber?: string;
  referralCountSnapshot: number;
  totalReferralsSnapshot?: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  isRewardFulfilled: boolean;
  reviewedAt?: string;
  fulfilledAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  rewardPlan: string;
  rewardDuration: number;
  rewardStartsAt?: string;
  rewardEndsAt?: string;
  appliedBusinesses?: Array<{
    business?: string;
    businessName?: string;
    previousPlanExpiresAt?: string;
    rewardStartsAt?: string;
    rewardEndsAt?: string;
  }>;
  createdAt: string;
}

export interface AdminOffersResponse {
  offers: ReferralOffer[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface AdminRequestsResponse {
  requests: RewardRequest[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface AdminReferralRow {
  _id: string;
  referrer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    activeReferralOffer?: string;
    activeReferralOfferSelectedAt?: string;
  };
  referredUser: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  offer: {
    _id: string;
    offerName: string;
    referralThreshold: number;
    rewardPlan: string;
    rewardDuration: number;
  };
  referralCode: string;
  status: 'pending' | 'valid' | 'invalid' | 'cancelled';
  invalidReason?: string;
  createdAt: string;
  validatedAt?: string;
}

export interface AdminReferralsResponse {
  referrals: AdminReferralRow[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface ReferralTreeNode {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string | null;
  referrals: Array<{
    referralId: string;
    referredUserId: string;
    status: 'pending' | 'valid' | 'invalid' | 'cancelled';
    offer: { _id: string; offerName: string } | null;
    createdAt: string;
    referredUser: ReferralTreeNode;
  }>;
}

export interface AdminReferralTreeResponse {
  roots: ReferralTreeNode[];
  depth: number;
  totalReferrals: number;
}

export interface ReferralDashboardStats {
  totalOffers: number;
  activeOffers: number;
  totalReferrals: number;
  validReferrals: number;
  pendingRequests: number;
  approvedRequests: number;
  totalUsers: number;
  topReferrers: Array<{
    userId: string;
    name: string;
    email: string;
    phone?: string;
    businessName?: string | null;
    referralCount: number;
    selectedOffer?: {
      _id: string;
      offerName: string;
      referralThreshold: number;
      rewardPlan: string;
      rewardDuration: number;
      status?: string;
      isActive?: boolean;
      validFrom?: string;
      validUntil?: string;
    } | null;
    selectedOfferProgress?: {
      valid: number;
      threshold: number;
      remaining: number;
    } | null;
    selectedOfferSelectedAt?: string | null;
  }>;
}

export type CreateOfferInput = {
  offerName: string;
  description?: string;
  referralThreshold: number;
  rewardPlan: string;
  rewardDuration: number;
  firstTimeOnly?: boolean;
  requiresFirstPaidPlan?: boolean;
  validFrom?: string;
  validUntil?: string;
  terms?: string;
  autoApprove?: boolean;
};

export const referralAdminApi = {
  async getStats(): Promise<ApiResponse<ReferralDashboardStats>> {
    return apiClient.get<ReferralDashboardStats>('/referrals/admin/stats', true);
  },

  async listOffers(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<AdminOffersResponse>> {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.page) usp.set('page', String(params.page));
    if (params?.limit) usp.set('limit', String(params.limit));

    const qs = usp.toString();
    return apiClient.get<AdminOffersResponse>(`/referrals/admin/offers${qs ? `?${qs}` : ''}`, true);
  },

  async createOffer(input: CreateOfferInput): Promise<ApiResponse<ReferralOffer>> {
    return apiClient.post<ReferralOffer>('/referrals/admin/offers', input, true);
  },

  async updateOffer(id: string, input: Partial<CreateOfferInput> & { status?: string }): Promise<ApiResponse<ReferralOffer>> {
    return apiClient.put<ReferralOffer>(`/referrals/admin/offers/${id}`, input, true);
  },

  async activateOffer(id: string): Promise<ApiResponse<ReferralOffer>> {
    return apiClient.put<ReferralOffer>(`/referrals/admin/offers/${id}/activate`, {}, true);
  },

  async closeOffer(id: string): Promise<ApiResponse<ReferralOffer>> {
    return apiClient.put<ReferralOffer>(`/referrals/admin/offers/${id}/close`, {}, true);
  },

  async listRequests(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<AdminRequestsResponse>> {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.page) usp.set('page', String(params.page));
    if (params?.limit) usp.set('limit', String(params.limit));

    const qs = usp.toString();
    return apiClient.get<AdminRequestsResponse>(`/referrals/admin/requests${qs ? `?${qs}` : ''}`, true);
  },

  async approveRequest(id: string, notes?: string): Promise<ApiResponse<unknown>> {
    return apiClient.put<unknown>(`/referrals/admin/requests/${id}/approve`, { notes }, true);
  },

  async rejectRequest(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.put<unknown>(`/referrals/admin/requests/${id}/reject`, { reason }, true);
  },

  async fulfillRequest(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.put<unknown>(`/referrals/admin/requests/${id}/fulfill`, {}, true);
  },

  async listReferrals(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<AdminReferralsResponse>> {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.page) usp.set('page', String(params.page));
    if (params?.limit) usp.set('limit', String(params.limit));

    const qs = usp.toString();
    return apiClient.get<AdminReferralsResponse>(`/referrals/admin/referrals${qs ? `?${qs}` : ''}`, true);
  },

  async getReferralTree(params?: { status?: string; depth?: number }): Promise<ApiResponse<AdminReferralTreeResponse>> {
    const usp = new URLSearchParams();
    if (params?.status) usp.set('status', params.status);
    if (params?.depth) usp.set('depth', String(params.depth));

    const qs = usp.toString();
    return apiClient.get<AdminReferralTreeResponse>(`/referrals/admin/tree${qs ? `?${qs}` : ''}`, true);
  },
};
