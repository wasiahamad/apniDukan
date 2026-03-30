import { apiClient, type ApiResponse } from '../apiClient';

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
export type OrderSource = 'website' | 'whatsapp' | 'manual';

export type OrderItem = {
  listing?: string;
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  _id: string;
  business: { _id: string; name: string; slug: string; whatsapp?: string };
  orderId: string;
  orderNumber: number;
  source: OrderSource;
  status: OrderStatus;
  customer: { name: string; phone?: string; address?: string; note?: string };
  items: OrderItem[];
  subtotal: number;
  deliveryCharges: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export const orderAdminApi = {
  async listOrders(params?: { status?: OrderStatus; businessId?: string; search?: string }): Promise<ApiResponse<Order[]>> {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.businessId) qp.set('businessId', params.businessId);
    if (params?.search) qp.set('search', params.search);

    const suffix = qp.toString() ? `?${qp.toString()}` : '';
    return apiClient.get<Order[]>(`/orders${suffix}`, true);
  },

  async updateStatus(orderMongoId: string, status: OrderStatus): Promise<ApiResponse<Order>> {
    return apiClient.patch<Order>(`/orders/${orderMongoId}/status`, { status }, true);
  },
};
