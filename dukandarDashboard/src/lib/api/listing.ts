/**
 * Listing (Products/Services) API Services
 */

import { apiClient, type ApiResponse } from '../api';
import type { Business } from './business';
import type { Category } from './category';

export interface Listing {
  _id: string;
  business: Business | string;
  title: string;
  slug: string;
  description: string;
  listingType: 'product' | 'service' | 'food' | 'course' | 'rental';
  price: number;
  priceType: 'fixed' | 'per_day' | 'per_month' | 'per_hour' | 'starting_from' | 'inquiry';
  category?: Category | string;
  images?: {
    url?: string;
    alt?: string;
  }[];
  attributes?: {
    name: string;
    value: string;
  }[];
  pricingOptions?: {
    label: string;
    price: number;
  }[];
  stock?: number;
  sku?: string;
  isActive: boolean;
  isFeatured: boolean;
  stats: {
    views: number;
    inquiries: number;
    bookings?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingData {
  business: string; // Business ID
  title: string;
  description: string;
  listingType: 'product' | 'service' | 'food' | 'course' | 'rental';
  price: number;
  priceType: 'fixed' | 'per_day' | 'per_month' | 'per_hour' | 'starting_from' | 'inquiry';
  category?: string;
  images?: {
    url?: string;
    alt?: string;
  }[];
  attributes?: {
    name: string;
    value: string;
  }[];
  pricingOptions?: {
    label: string;
    price: number;
  }[];
  stock?: number;
  sku?: string;
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  listingType?: 'product' | 'service' | 'food' | 'course' | 'rental';
  price?: number;
  priceType?: 'fixed' | 'per_day' | 'per_month' | 'per_hour' | 'starting_from' | 'inquiry';
  category?: string;
  images?: {
    url?: string;
    alt?: string;
  }[];
  attributes?: {
    name: string;
    value: string;
  }[];
  pricingOptions?: {
    label: string;
    price: number;
  }[];
  stock?: number;
  sku?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ListingResponse {
  listings: Listing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const listingApi = {
  /**
   * Get my listings (across all my businesses)
   */
  async getMyListings(page = 1, limit = 50): Promise<ApiResponse<ListingResponse>> {
    return apiClient.get<ListingResponse>(`/listings/my/listings?page=${page}&limit=${limit}`);
  },

  /**
   * Get listings by business ID
   */
  async getListingsByBusiness(businessId: string, page = 1, limit = 50): Promise<ApiResponse<ListingResponse>> {
    return apiClient.get<ListingResponse>(`/listings/business/${businessId}?page=${page}&limit=${limit}`);
  },

  /**
   * Get public listings by business ID (active only)
   */
  async getPublicListingsByBusiness(businessId: string, page = 1, limit = 50): Promise<ApiResponse<ListingResponse>> {
    return apiClient.get<ListingResponse>(`/listings/public/business/${businessId}?page=${page}&limit=${limit}`, false);
  },

  /**
   * Create new listing
   */
  async createListing(data: CreateListingData): Promise<ApiResponse<Listing>> {
    return apiClient.post<Listing>('/listings', data);
  },

  /**
   * Update listing
   */
  async updateListing(listingId: string, data: UpdateListingData): Promise<ApiResponse<Listing>> {
    return apiClient.put<Listing>(`/listings/${listingId}`, data);
  },

  /**
   * Delete listing
   */
  async deleteListing(listingId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/listings/${listingId}`);
  },

  /**
   * Get listing by ID (public)
   */
  async getListingById(listingId: string): Promise<ApiResponse<Listing>> {
    return apiClient.get<Listing>(`/listings/${listingId}`, false);
  },

  /**
   * Get my listing by ID (owner-only)
   */
  async getMyListingById(listingId: string): Promise<ApiResponse<Listing>> {
    return apiClient.get<Listing>(`/listings/my/${listingId}`);
  },

  /**
   * Search listings (public)
   */
  async searchListings(params: {
    search?: string;
    category?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ListingResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, String(value));
    });
    return apiClient.get<ListingResponse>(`/listings/search?${queryParams.toString()}`, false);
  },

  /**
   * Get featured listings (public)
   */
  async getFeaturedListings(limit = 10): Promise<ApiResponse<Listing[]>> {
    return apiClient.get<Listing[]>(`/listings/featured?limit=${limit}`, false);
  }
};
