import { apiClient, type ApiResponse } from '../apiClient';

export type CustomerLocation = {
  type?: 'Point';
  coordinates?: [number, number];
  accuracy?: number;
  capturedAt?: string;
};

export type CustomerBookingStats = {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
};

export type AdminCustomer = {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer';
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLogin?: string | null;
  currentLocation?: CustomerLocation | null;
  createdAt?: string;
  updatedAt?: string;
  bookingStats: CustomerBookingStats;
};

export type AdminCustomersListResponse = {
  customers: AdminCustomer[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

export const customersAdminApi = {
  async list(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<AdminCustomersListResponse>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<AdminCustomersListResponse>(`/auth/admin/customers${suffix}`, true);
  },
};
