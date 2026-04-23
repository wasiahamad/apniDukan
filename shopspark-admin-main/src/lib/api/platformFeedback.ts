import { apiClient, type ApiResponse } from '../apiClient';

export type AdminPlatformFeedbackUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
};

export type AdminPlatformFeedbackBusiness = {
  _id: string;
  name?: string;
  slug?: string;
  isActive?: boolean;
};

export type AdminPlatformFeedbackRow = {
  _id: string;
  userRole: 'customer' | 'business_owner';
  rating: number;
  feedback: string;
  user: AdminPlatformFeedbackUser | null;
  business?: AdminPlatformFeedbackBusiness;
  createdAt: string;
};

export type AdminPlatformFeedbackListResponse = {
  feedback: AdminPlatformFeedbackRow[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

export const platformFeedbackAdminApi = {
  async list({ page = 1, limit = 20 }: { page?: number; limit?: number }): Promise<ApiResponse<AdminPlatformFeedbackListResponse>> {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    return apiClient.get<AdminPlatformFeedbackListResponse>(`/platform-feedback/admin?${qs.toString()}`, true);
  },
};
