import { apiClient, type ApiResponse } from '../api';

export type PlatformFeedbackStats = {
  avgRating: number;
  totalCount: number;
};

export type SubmitPlatformFeedbackPayload = {
  rating: number;
  feedback?: string;
  source?: 'dukandarDashboard';
};

export const platformFeedbackApi = {
  async getStats(): Promise<ApiResponse<PlatformFeedbackStats>> {
    return apiClient.get<PlatformFeedbackStats>('/platform-feedback/stats', false);
  },

  async submit(payload: SubmitPlatformFeedbackPayload): Promise<ApiResponse<{ _id: string }>> {
    return apiClient.post<{ _id: string }>(
      '/platform-feedback',
      {
        rating: payload.rating,
        feedback: payload.feedback,
        source: payload.source || 'dukandarDashboard',
      },
      true
    );
  },
};
