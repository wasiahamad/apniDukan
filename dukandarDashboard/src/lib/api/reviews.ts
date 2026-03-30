import { apiClient, type ApiResponse } from '../api';

export type ReviewSummary = {
  avgRating: number;
  reviewsCount: number;
};

export type PublicReview = {
  _id: string;
  customerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

export type CreateReviewPayload = {
  rating: number;
  customerName?: string;
  comment?: string;
};

export const reviewApi = {
  async getSummaryByBusinessSlug(slug: string): Promise<ApiResponse<ReviewSummary>> {
    return apiClient.get<ReviewSummary>(`/reviews/business/${encodeURIComponent(slug)}/summary`, false);
  },

  async getReviewsByBusinessSlug(slug: string, limit = 10): Promise<ApiResponse<PublicReview[]>> {
    const qs = new URLSearchParams({ limit: String(limit) });
    return apiClient.get<PublicReview[]>(`/reviews/business/${encodeURIComponent(slug)}?${qs.toString()}`, false);
  },

  async createReviewByBusinessSlug(slug: string, payload: CreateReviewPayload): Promise<ApiResponse<PublicReview>> {
    return apiClient.post<PublicReview>(`/reviews/business/${encodeURIComponent(slug)}`, payload, false);
  },
};
