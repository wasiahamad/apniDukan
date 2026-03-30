import { apiClient, type ApiResponse } from '../apiClient';

export interface BusinessType {
  _id: string;
  name: string;
  slug?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessOwner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  referralCode?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  _id: string;
  owner?: BusinessOwner;
  name: string;
  slug: string;
  businessType?: BusinessType;
  logo?: string;
  coverImage?: string;
  branding?: {
    themeColor?: string;
    backgroundColor?: string;
    fontColor?: string;
    fontFamily?: string;
  };
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    location?: {
      type?: string;
      coordinates?: number[];
    };
  };
  description?: string;
  whyChooseUs?: Array<{ title: string; desc: string; iconName?: string }>;
  workingHours?: Record<string, { open?: string; close?: string; isOpen?: boolean }>;
  plan?: { _id: string; name: string };
  planExpiresAt?: string;
  isActive: boolean;
  isVerified: boolean;
  stats?: {
    totalListings?: number;
    totalInquiries?: number;
    totalViews?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessListResponse {
  businesses: Business[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export type AdminCreateOwnerInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type AdminCreateBusinessInput = {
  name: string;
  slug?: string;
  businessType: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  isActive?: boolean;
  isVerified?: boolean;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
    landmark?: string;
  };
  description?: string;
};

export type AdminCreateBusinessResponse = {
  owner: BusinessOwner;
  business: Business;
};

export const businessAdminApi = {
  async list(params?: {
    search?: string;
    city?: string;
    businessType?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<BusinessListResponse>> {
    const usp = new URLSearchParams();
    if (params?.search) usp.set('search', params.search);
    if (params?.city) usp.set('city', params.city);
    if (params?.businessType) usp.set('businessType', params.businessType);
    if (params?.page) usp.set('page', String(params.page));
    if (params?.limit) usp.set('limit', String(params.limit));

    const qs = usp.toString();
    return apiClient.get<BusinessListResponse>(`/business${qs ? `?${qs}` : ''}`, true);
  },

  async getById(id: string): Promise<ApiResponse<Business>> {
    return apiClient.get<Business>(`/business/admin/${id}`, true);
  },

  async updateStatus(id: string, input: { isActive?: boolean; isVerified?: boolean }): Promise<ApiResponse<Business>> {
    return apiClient.patch<Business>(`/business/admin/${id}/status`, input, true);
  },

  async updateWhyChooseUs(id: string, items: Array<{ title: string; desc: string; iconName?: string }>): Promise<ApiResponse<Business>> {
    return apiClient.put<Business>(`/business/${id}`, { whyChooseUs: items }, true);
  },

  async createWithOwner(input: {
    owner: AdminCreateOwnerInput;
    business: AdminCreateBusinessInput;
    planId?: string;
  }): Promise<ApiResponse<AdminCreateBusinessResponse>> {
    return apiClient.post<AdminCreateBusinessResponse>(`/business/admin/create`, input, true);
  },

  async updatePlan(
    id: string,
    input: {
      planId: string;
      durationInDays?: number;
      expiresAt?: string;
      isComped?: boolean;
      compReason?: string;
    }
  ): Promise<ApiResponse<Business>> {
    return apiClient.patch<Business>(`/business/admin/${id}/plan`, input, true);
  },
};
