/**
 * Bookings (Slot booking) API Services
 */

import { apiClient, type ApiResponse } from "../api";

export type BookingSlot = {
  _id: string;
  business: string;
  listing?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  status: "available" | "booked" | "completed" | "cancelled" | "no_show";
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerNotes?: string | null;
  bookedAt?: string | null;
  createdAt?: string;
};

export type BookingSlotTemplate = {
  _id: string;
  startTime: string;
  endTime: string;
  duration: number;
  price?: number;
  notes?: string;
};

export const bookingApi = {
  async createBulkSlots(input: {
    businessId: string;
    date: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
  }): Promise<ApiResponse<BookingSlot[]>> {
    return apiClient.post<BookingSlot[]>("/bookings/bulk", input, true);
  },

  async replaceSlotTemplates(input: {
    businessId: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
  }): Promise<ApiResponse<BookingSlotTemplate[]>> {
    return apiClient.post<BookingSlotTemplate[]>("/bookings/templates/replace", input, true);
  },

  async getSlotTemplatesForBusiness(input: {
    businessId: string;
  }): Promise<ApiResponse<BookingSlotTemplate[]>> {
    return apiClient.get<BookingSlotTemplate[]>(
      `/bookings/templates/business/${encodeURIComponent(input.businessId)}`,
      true
    );
  },

  async getBusinessBookings(input: {
    businessId: string;
    date?: string;
  }): Promise<
    ApiResponse<{
      bookings: BookingSlot[];
      pagination: { total: number; page: number; pages: number; limit: number };
    }>
  > {
    const q = new URLSearchParams();
    if (input.date) q.set("date", input.date);
    q.set("page", "1");
    q.set("limit", "200");
    const qs = q.toString();
    return apiClient.get(`/bookings/business/${encodeURIComponent(input.businessId)}${qs ? `?${qs}` : ""}`, true);
  },
};
