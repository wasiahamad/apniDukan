/**
 * Category API Services (Business-scoped)
 * Dukandar creates categories for their products/services
 */

import { apiClient, type ApiResponse } from '../api';

export interface Category {
  _id: string;
  business: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryData {
  businessId: string;
  name: string;
  description?: string;
  image?: string;
  order?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  order?: number;
}

export const categoryApi = {
  /**
   * Create category for dukandar's business
   */
  async createCategory(data: CreateCategoryData): Promise<ApiResponse<Category>> {
    return apiClient.post<Category>('/categories', data);
  },

  /**
   * Get categories for a specific business (public - for shop page)
   */
  async getCategoriesByBusiness(businessId: string): Promise<ApiResponse<Category[]>> {
    return apiClient.get<Category[]>(`/categories/business/${businessId}`, false);
  },

  /**
   * Get my business categories (for dukandar)
   */
  async getMyCategories(businessId: string): Promise<ApiResponse<Category[]>> {
    return apiClient.get<Category[]>(`/categories/my/${businessId}`);
  },

  /**
   * Get single category
   */
  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    return apiClient.get<Category>(`/categories/${id}`, false);
  },

  /**
   * Update category
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<ApiResponse<Category>> {
    return apiClient.put<Category>(`/categories/${id}`, data);
  },

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/categories/${id}`);
  },
};
