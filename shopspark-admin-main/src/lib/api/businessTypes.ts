import { apiClient, type ApiResponse } from "../apiClient";
import type { BusinessType } from "./business";

export const businessTypesApi = {
  async list(): Promise<ApiResponse<BusinessType[]>> {
    return apiClient.get<BusinessType[]>("/business-types", false);
  },
};

export type AdminBusinessTypeInput = {
  name: string;
  description?: string;
  icon?: string;
  iconName?: string;
  defaultCoverImage?: string;
  defaultImages?: string[];
  suggestedListingType?: 'product' | 'service' | 'food' | 'course' | 'rental';
  exampleCategories?: string[];
  whyChooseUsTemplates?: Array<{ title?: string; desc?: string; iconName?: string }>;
  isActive?: boolean;
  displayOrder?: number;
};

export const businessTypesAdminApi = {
  async list(params?: { search?: string; isActive?: boolean }): Promise<ApiResponse<BusinessType[]>> {
    const usp = new URLSearchParams();
    if (params?.search) usp.set('search', params.search);
    if (typeof params?.isActive !== 'undefined') usp.set('isActive', String(params.isActive));
    const qs = usp.toString();
    return apiClient.get<BusinessType[]>(`/business-types/admin/all${qs ? `?${qs}` : ''}`, true);
  },

  async create(input: AdminBusinessTypeInput): Promise<ApiResponse<BusinessType>> {
    return apiClient.post<BusinessType>(`/business-types`, input, true);
  },

  async update(id: string, input: Partial<AdminBusinessTypeInput>): Promise<ApiResponse<BusinessType>> {
    return apiClient.put<BusinessType>(`/business-types/${id}`, input, true);
  },

  async deactivate(id: string): Promise<ApiResponse<BusinessType>> {
    return apiClient.delete<BusinessType>(`/business-types/${id}`, true);
  },

  async generateWhyChooseUsTemplates(id: string, input?: { count?: number }): Promise<ApiResponse<Array<{ title?: string; desc?: string; iconName?: string }>>> {
    return apiClient.post<Array<{ title?: string; desc?: string; iconName?: string }>>(
      `/business-types/${id}/why-choose-us/generate`,
      input || {},
      true
    );
  },
};
