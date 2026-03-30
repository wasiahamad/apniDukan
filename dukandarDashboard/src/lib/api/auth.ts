/**
 * Authentication API Services
 */

import { apiClient, type ApiResponse } from '../api';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'business_owner' | 'admin';
  isActive: boolean;
  isEmailVerified?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterVerificationResponse {
  user: User;
  verificationRequired: boolean;
  otpExpiresInMinutes: number;
}

export interface VerifyOtpData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
  offerId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const setSession = (data: AuthResponse) => {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
};

export const authApi = {
  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse | RegisterVerificationResponse>> {
    const response = await apiClient.post<AuthResponse | RegisterVerificationResponse>('/auth/register', data, false);
    
    // Store tokens and user data
    if (response.success && response.data && 'accessToken' in response.data) {
      setSession(response.data);
    }
    
    return response;
  },

  /**
   * Login existing user
   */
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data, false);
    
    // Store tokens and user data
    if (response.success && response.data) {
      setSession(response.data);
    }
    
    return response;
  },

  /**
   * Fetch current user (requires auth)
   */
  async me(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<User>('/auth/me', true);
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response;
  },

  async verifyEmailOtp(data: VerifyOtpData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/verify-email-otp', data, false);
    if (response.success && response.data) {
      setSession(response.data);
    }
    return response;
  },

  async resendEmailOtp(email: string): Promise<ApiResponse<{ otpExpiresInMinutes: number }>> {
    return apiClient.post<{ otpExpiresInMinutes: number }>('/auth/resend-email-otp', { email }, false);
  },

  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse<{ otpExpiresInMinutes?: number }>> {
    return apiClient.post<{ otpExpiresInMinutes?: number }>('/auth/forgot-password', data, false);
  },

  async resendResetOtp(email: string): Promise<ApiResponse<{ otpExpiresInMinutes: number }>> {
    return apiClient.post<{ otpExpiresInMinutes: number }>('/auth/resend-reset-otp', { email }, false);
  },

  async resetPassword(data: ResetPasswordData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/reset-password', data, false);
    if (response.success && response.data) {
      setSession(response.data);
    }
    return response;
  },

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/auth/change-password', data, true);
  },

  async loginWithGoogle(token: string): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/social/google', { idToken: token, accessToken: token }, false);
    if (response.success && response.data) {
      setSession(response.data);
    }
    return response;
  },

  async loginWithFacebook(accessToken: string): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/social/facebook', { accessToken }, false);
    if (response.success && response.data) {
      setSession(response.data);
    }
    return response;
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
};
