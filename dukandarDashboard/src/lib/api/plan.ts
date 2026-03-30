/**
 * Plan (Subscription) API Services
 */

import { apiClient, type ApiResponse } from '../api';

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  description?: string;
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
    [key: string]: boolean | number | undefined;
  };
  isActive: boolean;
  isPopular?: boolean;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrderResponse {
  keyId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, any>;
  };
  plan: Plan;
  businessId: string;
}

export const planApi = {
  /**
   * Get all plans (public)
   */
  async getPlans(): Promise<ApiResponse<Plan[]>> {
    return apiClient.get<Plan[]>('/plans', false);
  },

  /**
   * Get plan by slug (public)
   */
  async getPlanBySlug(slug: string): Promise<ApiResponse<Plan>> {
    return apiClient.get<Plan>(`/plans/slug/${slug}`, false);
  },

  /**
   * Subscribe to plan
   */
  async subscribeToPlan(planId: string, businessId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/plans/${planId}/subscribe`, { businessId });
  },

  /**
   * Create Razorpay order for plan purchase
   */
  async createRazorpayOrder(planId: string, businessId: string): Promise<ApiResponse<RazorpayOrderResponse | { isFree: true; plan: Plan; businessId: string }>> {
    return apiClient.post('/payments/razorpay/order', { planId, businessId });
  },

  /**
   * Verify Razorpay payment and activate plan
   */
  async verifyRazorpayPayment(data: {
    planId: string;
    businessId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/payments/razorpay/verify', data);
  }
};
