/**
 * Business API Services
 */

import { apiClient, type ApiResponse } from '../api';

export type EntitlementFeatures = {
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

export type BusinessEntitlements = {
  plan?: unknown;
  planIsActive: boolean;
  source: 'plan' | 'fallback' | 'defaults' | string;
  features: EntitlementFeatures;
  expiresAt: string | null;
};

export interface BusinessType {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  defaultCoverImage?: string;
  defaultImages?: string[];
  whyChooseUsTemplates?: Array<{ title?: string; desc?: string; iconName?: string }>;
  suggestedListingType?: 'product' | 'service' | 'food' | 'course' | 'rental';
  exampleCategories?: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  price: number;
  durationInDays: number;
  features: {
    maxListings: number;
    publicShopEnabled?: boolean;
    bookingEnabled: boolean;
    featuredEnabled: boolean;
    maxFeaturedListings?: number;
    prioritySupport: boolean;
    whatsappIntegration: boolean;
    customDomain: boolean;
    analyticsEnabled: boolean;
    removeWatermark?: boolean;
    seoTools?: boolean;
    apiAccess?: boolean;

    supportTicketsEnabled?: boolean;
    referralsEnabled?: boolean;
    invoicesEnabled?: boolean;
    brandingEnabled?: boolean;
    whatsappSettingsEnabled?: boolean;
    ordersEnabled?: boolean;
    inquiriesEnabled?: boolean;
  };
}

export interface Business {
  _id: string;
  owner: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  phone: string;
  whatsapp?: string;
  whatsappOrderMessageTemplate?: string;
  whatsappAutoGreetingEnabled?: boolean;
  whatsappAutoGreetingMessage?: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  description?: string;
  whyChooseUs?: Array<{ title: string; desc: string; iconName?: string }>;
  logo?: string;
  coverImage?: string;
  branding?: {
    themeColor?: string;
    backgroundColor?: string;
    fontColor?: string;
    fontFamily?: string;
  };
  images?: string[];
  plan?: Plan;
  planExpiresAt?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  socialMediaCustom?: Array<{
    label: string;
    url: string;
  }>;
  workingHours?: {
    monday?: { open: string; close: string; isOpen: boolean };
    tuesday?: { open: string; close: string; isOpen: boolean };
    wednesday?: { open: string; close: string; isOpen: boolean };
    thursday?: { open: string; close: string; isOpen: boolean };
    friday?: { open: string; close: string; isOpen: boolean };
    saturday?: { open: string; close: string; isOpen: boolean };
    sunday?: { open: string; close: string; isOpen: boolean };
  };
  openStatusMode?: 'auto' | 'open' | 'closed';
  isActive: boolean;
  isVerified: boolean;
  stats: {
    totalListings: number;
    totalInquiries: number;
    totalViews: number;
    whatsappClicks?: number;
    callClicks?: number;
    mapClicks?: number;
  };
}

export interface CreateBusinessData {
  name: string;
  businessType: string; // BusinessType ID
  phone: string;
  whatsapp?: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  description?: string;
  logo?: string;
  coverImage?: string;
}

export interface UpdateBusinessData {
  name?: string;
  businessType?: string;
  phone?: string;
  whatsapp?: string;
  whatsappOrderMessageTemplate?: string;
  whatsappAutoGreetingEnabled?: boolean;
  whatsappAutoGreetingMessage?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  description?: string;
  whyChooseUs?: Array<{ title: string; desc: string; iconName?: string }>;
  logo?: string;
  coverImage?: string;
  branding?: {
    themeColor?: string;
    backgroundColor?: string;
    fontColor?: string;
    fontFamily?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  socialMediaCustom?: Array<{
    label: string;
    url: string;
  }>;
  workingHours?: {
    monday?: { open: string; close: string; isOpen: boolean };
    tuesday?: { open: string; close: string; isOpen: boolean };
    wednesday?: { open: string; close: string; isOpen: boolean };
    thursday?: { open: string; close: string; isOpen: boolean };
    friday?: { open: string; close: string; isOpen: boolean };
    saturday?: { open: string; close: string; isOpen: boolean };
    sunday?: { open: string; close: string; isOpen: boolean };
  };
  openStatusMode?: 'auto' | 'open' | 'closed';
}

let myBusinessesCache: Business[] | null = null;
let myBusinessesPromise: Promise<ApiResponse<Business[]>> | null = null;

export const businessApi = {
  clearCache() {
    myBusinessesCache = null;
    myBusinessesPromise = null;
  },

  /**
   * Get my businesses
   */
  async getMyBusinesses(options?: { force?: boolean }): Promise<ApiResponse<Business[]>> {
    if (!options?.force) {
      if (myBusinessesCache) {
        return { success: true, data: myBusinessesCache };
      }
      if (myBusinessesPromise) {
        return myBusinessesPromise;
      }
    }

    myBusinessesPromise = apiClient.get<Business[]>('/business/my/businesses');
    const response = await myBusinessesPromise;
    myBusinessesPromise = null;

    if (response.success && response.data) {
      myBusinessesCache = response.data;
    }

    return response;
  },

  /**
   * Create new business
   */
  async createBusiness(data: CreateBusinessData): Promise<ApiResponse<Business>> {
    const response = await apiClient.post<Business>('/business', data);
    if (response.success) {
      myBusinessesCache = null;
    }
    return response;
  },

  /**
   * Update business
   */
  async updateBusiness(businessId: string, data: UpdateBusinessData): Promise<ApiResponse<Business>> {
    const response = await apiClient.put<Business>(`/business/${businessId}`, data);
    if (response.success) {
      myBusinessesCache = null;
    }
    return response;
  },

  /**
   * Get business by slug (public)
   */
  async getBusinessBySlug(slug: string): Promise<ApiResponse<Business>> {
    return apiClient.get<Business>(`/business/slug/${slug}`, false);
  },

  /**
   * Start social OAuth connect flow (returns provider URL)
   */
  async getSocialOAuthUrl(
    platform: 'facebook' | 'instagram' | 'twitter' | 'youtube',
    businessId: string
  ): Promise<ApiResponse<{ url: string }>> {
    return apiClient.get<{ url: string }>(`/social/oauth/${platform}/url?businessId=${encodeURIComponent(businessId)}`);
  },

  /**
   * Connect YouTube using Google access token (popup flow)
   */
  async connectYoutubeWithToken(businessId: string, accessToken: string): Promise<ApiResponse<{ url: string }>> {
    return apiClient.post<{ url: string }>(`/social/oauth/youtube/connect-token`, { businessId, accessToken });
  },

  /**
   * Get business by ID (public)
   */
  async getBusinessById(id: string): Promise<ApiResponse<Business>> {
    return apiClient.get<Business>(`/business/${id}`, false);
  },

  /**
   * Get business stats
   */
  async getBusinessStats(businessId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/business/${businessId}/stats`);
  },

  /**
   * Get effective entitlements for a business (owner/admin)
   */
  async getEntitlements(businessId: string): Promise<ApiResponse<BusinessEntitlements>> {
    return apiClient.get<BusinessEntitlements>(`/business/${businessId}/entitlements`);
  },
};

/**
 * Business Type API
 */
export const businessTypeApi = {
  /**
   * Get all business types (public)
   */
  async getAllBusinessTypes(): Promise<ApiResponse<BusinessType[]>> {
    return apiClient.get<BusinessType[]>('/business-types', false);
  },

  /**
   * Get business type by ID or slug
   */
  async getBusinessType(identifier: string): Promise<ApiResponse<BusinessType>> {
    return apiClient.get<BusinessType>(`/business-types/${identifier}`, false);
  },
};
