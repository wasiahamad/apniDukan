import { apiClient } from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export type InvoiceStatus = "paid" | "pending" | "failed";

export interface AdminInvoice {
  _id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  business?: { _id: string; name: string };
  owner?: { _id: string; email: string };
  paymentProvider?: string;
  payment?: {
    method?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
  };
}

export interface AdminInvoiceListResponse {
  items: AdminInvoice[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const invoiceAdminApi = {
  async list(params?: {
    search?: string;
    status?: InvoiceStatus;
    businessId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.businessId) qs.set("businessId", params.businessId);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiClient.get<AdminInvoiceListResponse>(`/invoices/admin${suffix}`);
  },

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_BASE_URL}/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let msg = "Failed to download invoice";
      try {
        const data = await res.json();
        msg = data?.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    return res.blob();
  },
};
