import { apiClient, type ApiResponse } from '../api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export type InvoiceStatus = 'paid' | 'pending' | 'failed';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  business?: { _id: string; name: string };
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  paymentProvider?: string;
  payment?: {
    method?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
  };
}

export const invoiceApi = {
  async listMyInvoices(params?: { businessId?: string }): Promise<ApiResponse<Invoice[]>> {
    const qs = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : '';
    return apiClient.get<Invoice[]>(`/invoices${qs}`);
  },

  async downloadInvoicePdf(invoiceId: string): Promise<Blob> {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE_URL}/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let msg = 'Failed to download invoice';
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
