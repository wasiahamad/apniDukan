import { apiClient, type ApiResponse } from '../api';

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

export const supportApi = {
  async createTicket(input: { issueType: SupportIssueType | string; message: string }): Promise<ApiResponse<SupportTicket>> {
    return apiClient.post<SupportTicket>('/support/tickets', input, true);
  },

  async listMyTickets(params?: { status?: SupportTicketStatus }): Promise<ApiResponse<SupportTicket[]>> {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    const suffix = qp.toString() ? `?${qp.toString()}` : '';
    return apiClient.get<SupportTicket[]>(`/support/tickets${suffix}`, true);
  },

  async addMessage(ticketMongoId: string, message: string): Promise<ApiResponse<SupportTicket>> {
    return apiClient.post<SupportTicket>(`/support/tickets/${ticketMongoId}/messages`, { message }, true);
  },
};
