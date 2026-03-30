import { apiClient, type ApiResponse } from '../apiClient';

export interface Plan {
  _id: string;
  name: string;
  slug?: string;
  price: number;
  durationInDays: number;
  isPublic?: boolean;
  features: PlanFeatures;
  description?: string;
  isActive: boolean;
  isPopular?: boolean;
  order?: number;
}

export type PlanFeatures = {
  maxListings: number;
  publicShopEnabled: boolean;
  bookingEnabled: boolean;
  featuredEnabled: boolean;
  maxFeaturedListings: number;
  customDomain: boolean;
  analyticsEnabled: boolean;
  prioritySupport: boolean;
  whatsappIntegration: boolean;
  removeWatermark: boolean;
  seoTools: boolean;
  apiAccess: boolean;

  supportTicketsEnabled: boolean;
  referralsEnabled: boolean;
  invoicesEnabled: boolean;
  brandingEnabled: boolean;
  whatsappSettingsEnabled: boolean;

  ordersEnabled: boolean;
  inquiriesEnabled: boolean;
};

export type PlanUpsertInput = {
  name: string;
  slug?: string;
  price: number;
  durationInDays: number;
  isPublic?: boolean;
  features?: Partial<PlanFeatures>;
  description?: string;
  isPopular?: boolean;
  order?: number;
  isActive?: boolean;
};

export const plansApi = {
  async list(options?: { includeInactive?: boolean; includeHidden?: boolean }): Promise<ApiResponse<Plan[]>> {
    const usp = new URLSearchParams();
    if (options?.includeInactive) usp.set('includeInactive', 'true');
    if (options?.includeHidden) usp.set('includeHidden', 'true');
    const qs = usp.toString();
    return apiClient.get<Plan[]>(`/plans${qs ? `?${qs}` : ''}`, true);
  },

  async create(input: PlanUpsertInput): Promise<ApiResponse<Plan>> {
    return apiClient.post<Plan>('/plans', input, true);
  },

  async update(id: string, input: Partial<PlanUpsertInput>): Promise<ApiResponse<Plan>> {
    return apiClient.put<Plan>(`/plans/${id}`, input, true);
  },

  async remove(id: string): Promise<ApiResponse<unknown>> {
    return apiClient.delete<unknown>(`/plans/${id}`, true);
  },
};
