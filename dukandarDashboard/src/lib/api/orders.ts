import { apiClient, type ApiResponse } from '../api';

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
export type OrderSource = 'website' | 'whatsapp' | 'manual';

export type OrderItem = {
  listing?: string;
  pricingOptionLabel?: string;
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

export const orderApi = {
  async createPublicOrder(input: {
    businessId: string;
    source?: OrderSource;
    customer?: { name?: string; phone?: string; address?: string; note?: string };
    items: Array<{ listingId: string; quantity: number; pricingOptionLabel?: string }>;
  }): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>('/orders/public', input, false);
  },

  async getMyOrders(): Promise<ApiResponse<Order[]>> {
    return apiClient.get<Order[]>('/orders/my', true);
  },

  async getMyOrdersSummary(): Promise<
    ApiResponse<{ totalOrders: number; pending: number; confirmed: number; delivered: number; cancelled: number }>
  > {
    return apiClient.get('/orders/my/summary', true);
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<ApiResponse<Order>> {
    return apiClient.patch<Order>(`/orders/${orderId}/status`, { status }, true);
  },
};
