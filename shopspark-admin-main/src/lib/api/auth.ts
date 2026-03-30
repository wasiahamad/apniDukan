import { apiClient, type ApiResponse } from '../apiClient';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'business_owner' | 'staff';
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ImpersonateResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data, false);

    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  },

  async me(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me', true);
  },

  async impersonateBusiness(businessId: string): Promise<ApiResponse<ImpersonateResponse>> {
    return apiClient.post<ImpersonateResponse>('/auth/admin/impersonate', { businessId }, true);
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
