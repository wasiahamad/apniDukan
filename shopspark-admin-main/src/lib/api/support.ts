import { apiClient, type ApiResponse } from '../apiClient';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportIssueType = 'billing' | 'technical' | 'other';

export type SupportMessage = {
  _id?: string;
  senderRole: 'user' | 'admin';
  sender?: { _id: string; name?: string; email?: string } | string | null;
  message: string;
  createdAt: string;
};

export type SupportTicket = {
  _id: string;
  ticketNumber: number;
  ticketId: string;
  issueType: SupportIssueType;
  status: SupportTicketStatus;
  business?: { _id: string; name: string; slug: string } | string;
  owner?: { _id: string; name: string; email?: string; phone?: string } | string;
  assignedTo?: { _id: string; name?: string; email?: string } | string | null;
  messages: SupportMessage[];
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminTicketListResponse = {
  items: SupportTicket[];
  page: number;
  limit: number;
  total: number;
};

export const supportAdminApi = {
  async listTickets(params?: { search?: string; status?: SupportTicketStatus; page?: number; limit?: number }): Promise<ApiResponse<AdminTicketListResponse>> {
    const qp = new URLSearchParams();
    if (params?.search) qp.set('search', params.search);
    if (params?.status) qp.set('status', params.status);
    if (params?.page) qp.set('page', String(params.page));
    if (params?.limit) qp.set('limit', String(params.limit));
    const suffix = qp.toString() ? `?${qp.toString()}` : '';
    return apiClient.get<AdminTicketListResponse>(`/support/admin/tickets${suffix}`, true);
  },

  async getTicket(ticketMongoId: string): Promise<ApiResponse<SupportTicket>> {
    return apiClient.get<SupportTicket>(`/support/admin/tickets/${ticketMongoId}`, true);
  },

  async updateTicket(ticketMongoId: string, input: { status?: SupportTicketStatus; assignedTo?: string | null }): Promise<ApiResponse<SupportTicket>> {
    return apiClient.patch<SupportTicket>(`/support/admin/tickets/${ticketMongoId}`, input, true);
  },

  async addMessage(ticketMongoId: string, message: string): Promise<ApiResponse<SupportTicket>> {
    return apiClient.post<SupportTicket>(`/support/admin/tickets/${ticketMongoId}/messages`, { message }, true);
  },
};
