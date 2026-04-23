import { apiClient, type ApiResponse } from "@/lib/api";

export type AiChatPayload = {
  businessId: string;
  userMessage: string;
};

export type AiChatData = {
  reply: string;
};

export type AiGenerateMode = "listing" | "business_description" | "why_choose_us" | "branding";

export type AiListingDraft = {
  title: string;
  description: string;
  shortDescription: string;
  features: string[];
  tags: string[];
  attributes?: Array<{ name: string; value: string }>;
  pricingOptions?: Array<{ label: string; price: number }>;
};

export type AiBusinessDescription = {
  description: string;
};

export type AiWhyChooseUs = {
  cards: Array<{ title: string; desc: string }>;
};

export type AiBrandingSuggestion = {
  themeColor: string;
  backgroundColor: string;
  fontColor: string;
  fontFamily: string;
};

export type AiGenerateResponseMap = {
  listing: AiListingDraft;
  business_description: AiBusinessDescription;
  why_choose_us: AiWhyChooseUs;
  branding: AiBrandingSuggestion;
};

const VIEW_SESSION_KEY = "publicdukan_view_session_id";

const getViewSessionId = () => {
  try {
    const existing = localStorage.getItem(VIEW_SESSION_KEY);
    if (existing) return existing;

    const sid = `sid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(VIEW_SESSION_KEY, sid);
    return sid;
  } catch {
    return "";
  }
};

export const aiApi = {
  chat: async (payload: AiChatPayload): Promise<ApiResponse<AiChatData>> => {
    const sid = getViewSessionId();
    return apiClient.post<AiChatData>(
      "/ai/chat",
      {
        businessId: String(payload?.businessId || "").trim(),
        userMessage: String(payload?.userMessage || "").trim(),
      },
      false,
      sid ? { "x-session-id": sid } : undefined
    );
  },

  generate: async <M extends AiGenerateMode>(
    payload: { mode: M } & (M extends "listing"
      ? { title: string; businessType?: string }
      : { businessId?: string; maxCards?: number })
  ): Promise<ApiResponse<AiGenerateResponseMap[M]>> => {
    return apiClient.post<AiGenerateResponseMap[M]>("/ai/generate", payload);
  },
};
