import { apiClient, type ApiResponse } from "../api";

export type StoryKind = "story" | "reel";
export type StoryMediaType = "image" | "video";

export type StoryBusiness = {
  _id: string;
  name: string;
  logo: string | null;
  slug: string | null;
} | null;

export type StoryItem = {
  _id: string;
  businessId: string;
  business?: StoryBusiness;
  kind: StoryKind;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption: string;
  durationSec: number | null;
  linkUrl: string | null;
  viewsCount?: number;
  createdAt: string;
  expiresAt: string | null;
};

export type StoryViewer = {
  viewer: {
    _id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
  viewedAt: string;
};

export const storiesApi = {
  async create(input: { file: File; caption?: string; kind?: StoryKind; durationSec?: number | null; linkUrl?: string | null }): Promise<ApiResponse<StoryItem>> {
    const form = new FormData();
    form.append("file", input.file);
    if (input.caption) form.append("caption", input.caption);
    form.append("kind", input.kind || "story");
    if (typeof input.durationSec === "number" && Number.isFinite(input.durationSec)) {
      form.append("durationSec", String(Math.floor(input.durationSec)));
    }
    if (input.linkUrl) form.append("linkUrl", input.linkUrl);
    return apiClient.postForm<StoryItem>("/story", form, true);
  },

  async createFromListing(input: { listingId: string; kind?: StoryKind; caption?: string; durationSec?: number | null; file?: File }): Promise<ApiResponse<StoryItem>> {
    const form = new FormData();
    form.append("listingId", input.listingId);
    form.append("kind", input.kind || "story");
    if (input.caption) form.append("caption", input.caption);
    if (typeof input.durationSec === "number" && Number.isFinite(input.durationSec)) {
      form.append("durationSec", String(Math.floor(input.durationSec)));
    }
    if (input.file) {
      form.append("file", input.file);
    }
    return apiClient.postForm<StoryItem>("/stories/from-listing", form, true);
  },

  async listActive(params?: { kind?: StoryKind; businessId?: string }): Promise<ApiResponse<StoryItem[]>> {
    const usp = new URLSearchParams();
    if (params?.kind) usp.set("kind", params.kind);
    if (params?.businessId) usp.set("businessId", params.businessId);
    const qs = usp.toString();
    return apiClient.get<StoryItem[]>(`/stories${qs ? `?${qs}` : ""}`, true);
  },

  async listViewers(storyId: string): Promise<ApiResponse<StoryViewer[]>> {
    return apiClient.get<StoryViewer[]>(`/stories/${encodeURIComponent(storyId)}/viewers`, true);
  },

  async update(
    storyId: string,
    input: { caption?: string; durationSec?: number | null; linkUrl?: string | null }
  ): Promise<ApiResponse<StoryItem>> {
    return apiClient.patch<StoryItem>(`/stories/${encodeURIComponent(storyId)}`, input, true);
  },

  async remove(storyId: string): Promise<ApiResponse<{ message?: string }>> {
    return apiClient.delete<{ message?: string }>(`/stories/${encodeURIComponent(storyId)}`, true);
  },
};
