/**
 * API Client Configuration
 * Centralized API client with auth token management
 */

import { getAcceptLanguageHeader, getPreferredLanguage, withLangQueryParam } from '@/lib/language';

const isLocalhostUrl = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withProtocol);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
};

const resolveApiBaseUrl = () => {
  const env = String(import.meta.env.VITE_API_URL || '').trim();
  if (env && !(import.meta.env.PROD && isLocalhostUrl(env))) return env;
  if (import.meta.env.DEV) return 'http://localhost:5000/api';
  return 'https://apnidukan-vlnw.onrender.com/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

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

  private getHeaders(includeAuth = true, extraHeaders?: HeadersInit): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      const lang = getPreferredLanguage();
      headers['Accept-Language'] = getAcceptLanguageHeader(lang);
    } catch {
      // ignore
    }

    if (includeAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (extraHeaders) {
      Object.assign(headers as any, extraHeaders as any);
    }

    return headers;
  }

  private getAuthOnlyHeaders(includeAuth = true, extraHeaders?: HeadersInit): HeadersInit {
    const headers: HeadersInit = {};

    if (includeAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (extraHeaders) {
      Object.assign(headers as any, extraHeaders as any);
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
      error.status = response.status;
      if (data?.code) {
        error.code = data.code;
      }
      throw error;
    }

    return data;
  }

  async get<T>(endpoint: string, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'GET',
      headers: this.getHeaders(includeAuth, extraHeaders),
      cache: 'no-store',
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body: any, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth, extraHeaders),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async postForm<T>(endpoint: string, formData: FormData, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'POST',
      headers: this.getAuthOnlyHeaders(includeAuth, extraHeaders),
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, body: any, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth, extraHeaders),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, body: any, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'PATCH',
      headers: this.getHeaders(includeAuth, extraHeaders),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, includeAuth = true, extraHeaders?: HeadersInit): Promise<ApiResponse<T>> {
    const lang = getPreferredLanguage();
    const response = await fetch(`${this.baseURL}${withLangQueryParam(endpoint, lang)}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth, extraHeaders),
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
