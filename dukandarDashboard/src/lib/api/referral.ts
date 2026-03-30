/**
 * Referral API Services
 */

import { apiClient, type ApiResponse } from '../api';

export interface ReferralOffer {
  _id: string;
  offerName: string;
  description?: string;
  referralThreshold: number;
  rewardPlan: 'free' | 'starter' | 'pro' | 'business' | 'enterprise' | 'basic' | 'standard' | 'premium';
  rewardDuration: number;
  firstTimeOnly: boolean;
  requiresFirstPaidPlan: boolean;
  status: 'draft' | 'active' | 'closed' | 'archived';
  validFrom: string;
  validUntil?: string;
  stats: {
    totalReferrals: number;
    totalRewardsRequested: number;
    totalRewardsApproved: number;
    totalRewardsRejected: number;
    totalDukandarsParticipating: number;
  };
  terms?: string;
  autoApprove: boolean;
  isActive: boolean;
  isCurrentlyValid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  _id: string;
  referrer: string;
  referredUser: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  offer:
    | string
    | {
        _id: string;
        offerName?: string;
        referralThreshold?: number;
      };
  referralCode: string;
  status: 'pending' | 'valid' | 'invalid' | 'cancelled';
  isValidated: boolean;
  validatedAt?: string;
  invalidReason?: string;
  referredUserHasPaidPlan: boolean;
  referredUserFirstPaymentDate?: string;
  metadata?: {
    referredUserEmail?: string;
    referredUserName?: string;
    referredUserPhone?: string;
    referredBusinessName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRewardRequest {
  _id: string;
  user: string;
  offer: {
    _id: string;
    offerName: string;
    rewardPlan: string;
    rewardDuration: number;
  };
  requestNumber: string;
  referralCountSnapshot: number;
  totalReferralsSnapshot: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
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
  rewardValue: number;
  isRewardFulfilled: boolean;
  reviewedAt?: string;
  fulfilledAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralStats {
  referralCode: string;
  stats: {
    total: number;
    valid: number;
    pending: number;
    invalid: number;
    cancelled: number;
  };
  activeOffer: ReferralOffer | null;
  offers?: ReferralOffer[];
  selectedOfferId?: string | null;
  canChangeSelectedOffer?: boolean;
  selectedOfferProgress?: {
    valid: number;
    threshold: number;
    isComplete: boolean;
  } | null;
  referrals: Referral[];
  pendingRequests: ReferralRewardRequest[];
  approvedRewards: ReferralRewardRequest[];
}

// Get active referral offer (public)
const getActiveOffer = async (): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.get('/referrals/offer/active');
};

// Get my referral stats
const getMyReferralStats = async (): Promise<ApiResponse<ReferralStats>> => {
  return apiClient.get('/referrals/my/stats');
};

// Get my referral history
const getMyReferralHistory = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiResponse<{
  referrals: Referral[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  
  const queryString = queryParams.toString();
  return apiClient.get(`/referrals/my/history${queryString ? `?${queryString}` : ''}`);
};

// Create a referral (when someone signs up using my code)
const createReferral = async (data: {
  referralCode: string;
  offerId?: string;
}): Promise<ApiResponse<Referral>> => {
  return apiClient.post('/referrals', data);
};

// Set my active referral offer (one offer at a time)
const setMyActiveReferralOffer = async (data: { offerId: string }): Promise<ApiResponse<{ selectedOfferId: string }>> => {
  return apiClient.put('/referrals/my/active-offer', data);
};

// Request reward
const requestReward = async (data: {
  offerId: string;
}): Promise<ApiResponse<ReferralRewardRequest>> => {
  return apiClient.post('/referrals/request-reward', data);
};

// Validate referral payment (admin/system)
const validateReferralPayment = async (
  id: string,
  data: { hasPaid: boolean; paymentDate?: string }
): Promise<ApiResponse<Referral>> => {
  return apiClient.put(`/referrals/${id}/validate-payment`, data);
};

// Admin: Create referral offer
const createReferralOffer = async (data: {
  offerName: string;
  description?: string;
  referralThreshold: number;
  rewardPlan: 'basic' | 'standard' | 'premium';
  rewardDuration: number;
  firstTimeOnly?: boolean;
  requiresFirstPaidPlan?: boolean;
  validFrom?: string;
  validUntil?: string;
  terms?: string;
  autoApprove?: boolean;
}): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.post('/referrals/admin/offers', data);
};

// Admin: Get all referral offers
const getAllReferralOffers = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{
  offers: ReferralOffer[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}>> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  return apiClient.get(`/referrals/admin/offers${queryString ? `?${queryString}` : ''}`);
};

// Admin: Get single referral offer
const getReferralOfferById = async (id: string): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.get(`/referrals/admin/offers/${id}`);
};

// Admin: Update referral offer
const updateReferralOffer = async (
  id: string,
  data: Partial<ReferralOffer>
): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.put(`/referrals/admin/offers/${id}`, data);
};

// Admin: Activate referral offer
const activateReferralOffer = async (id: string): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.put(`/referrals/admin/offers/${id}/activate`, {});
};

// Admin: Close referral offer
const closeReferralOffer = async (id: string): Promise<ApiResponse<ReferralOffer>> => {
  return apiClient.put(`/referrals/admin/offers/${id}/close`, {});
};

// Admin: Get all reward requests
const getAllRewardRequests = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{
  requests: ReferralRewardRequest[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}>> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  return apiClient.get(`/referrals/admin/requests${queryString ? `?${queryString}` : ''}`);
};

// Admin: Approve reward request
const approveRewardRequest = async (
  id: string,
  notes?: string
): Promise<ApiResponse<ReferralRewardRequest>> => {
  return apiClient.put(`/referrals/admin/requests/${id}/approve`, { notes });
};

// Admin: Reject reward request
const rejectRewardRequest = async (
  id: string,
  reason: string
): Promise<ApiResponse<ReferralRewardRequest>> => {
  return apiClient.put(`/referrals/admin/requests/${id}/reject`, { reason });
};

// Admin: Fulfill reward request
const fulfillRewardRequest = async (id: string): Promise<ApiResponse<ReferralRewardRequest>> => {
  return apiClient.put(`/referrals/admin/requests/${id}/fulfill`, {});
};

// Admin: Get dashboard stats
const getReferralDashboardStats = async (): Promise<ApiResponse<{
  totalOffers: number;
  activeOffers: number;
  totalReferrals: number;
  validReferrals: number;
  pendingRequests: number;
  approvedRequests: number;
  totalUsers: number;
  topReferrers: Array<{
    name: string;
    email: string;
    referralCount: number;
  }>;
}>> => {
  return apiClient.get('/referrals/admin/stats');
};

export const referralApi = {
  // Public
  getActiveOffer,
  
  // Business owner
  getMyReferralStats,
  getMyReferralHistory,
  createReferral,
  setMyActiveReferralOffer,
  requestReward,
  validateReferralPayment,
  
  // Admin
  createReferralOffer,
  getAllReferralOffers,
  getReferralOfferById,
  updateReferralOffer,
  activateReferralOffer,
  closeReferralOffer,
  getAllRewardRequests,
  approveRewardRequest,
  rejectRewardRequest,
  fulfillRewardRequest,
  getReferralDashboardStats,
};
