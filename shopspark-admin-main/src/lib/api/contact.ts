import { apiClient, type ApiResponse } from "../apiClient";

export type AdminContactSettings = {
  whatsappNumber: string;
  email: string;
  officeAddress: string;
};

export type ContactMessageStatus = "open" | "resolved";

export type AdminContactMessage = {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: ContactMessageStatus;
  adminNote?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    source?: string;
  };
};

export type AdminContactMessageListResponse = {
  items: AdminContactMessage[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

export const contactAdminApi = {
  getSettings(): Promise<ApiResponse<AdminContactSettings>> {
    return apiClient.get<AdminContactSettings>("/contact/admin/settings", true);
  },

  updateSettings(input: AdminContactSettings): Promise<ApiResponse<AdminContactSettings>> {
    return apiClient.put<AdminContactSettings>("/contact/admin/settings", input, true);
  },

  listMessages(params?: { page?: number; limit?: number; status?: ContactMessageStatus }): Promise<ApiResponse<AdminContactMessageListResponse>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    const suffix = qs.toString();
    return apiClient.get<AdminContactMessageListResponse>(`/contact/admin/messages${suffix ? `?${suffix}` : ""}`, true);
  },

  getMessage(id: string): Promise<ApiResponse<AdminContactMessage>> {
    return apiClient.get<AdminContactMessage>(`/contact/admin/messages/${encodeURIComponent(id)}`, true);
  },

  updateMessage(id: string, input: { status?: ContactMessageStatus; adminNote?: string }): Promise<ApiResponse<AdminContactMessage>> {
    return apiClient.patch<AdminContactMessage>(`/contact/admin/messages/${encodeURIComponent(id)}`, input, true);
  },
};
