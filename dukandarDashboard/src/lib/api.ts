/**
 * API Client Configuration
 * Centralized API client with auth token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private getAuthOnlyHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {};

    if (includeAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        // Do not force logout for deactivated-account responses.
        if (data?.code === 'ACCOUNT_DEACTIVATED' || data?.message === 'Account is deactivated') {
          throw new Error(data.message || 'Account is deactivated');
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      const error: any = new Error(data.message || 'API request failed');
      if (data?.code) {
        error.code = data.code;
      }
      throw error;
    }

    return data;
  }

  async get<T>(endpoint: string, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(includeAuth),
      cache: 'no-store',
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body: any, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async postForm<T>(endpoint: string, formData: FormData, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthOnlyHeaders(includeAuth),
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, body: any, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, body: any, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, includeAuth = true): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });
    return this.handleResponse<T>(response);
  }

  async uploadImage(file: File): Promise<string> {
    // Placeholder for image upload (integrate with Cloudinary/S3)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse };
