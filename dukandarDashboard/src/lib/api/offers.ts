import { apiClient, type ApiResponse } from '../api';

export type ShopOfferType = 'bogo' | 'discount_percent' | 'discount_flat' | 'custom';
export type ShopOfferStatus = 'draft' | 'active' | 'paused' | 'archived';

export type ShopOffer = {
  _id: string;
  owner: string;
  listingId?: string;
  title: string;
  titleHi?: string;
  description?: string;
  descriptionHi?: string;
  type: ShopOfferType;
  percentOff?: number;
  amountOff?: number;
  bogo?: {
    buyQty?: number;
    getQty?: number;
    label?: string;
    labelHi?: string;
  };
  banner?: {
    imageUrl?: string;
    linkUrl?: string;
  };
  status: ShopOfferStatus;
  validFrom?: string;
  validUntil?: string;
  appliesToAllBusinesses?: boolean;
  businessIds?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateShopOfferPayload = Partial<
  Pick<
    ShopOffer,
    | 'title'
    | 'titleHi'
    | 'description'
    | 'descriptionHi'
    | 'type'
    | 'percentOff'
    | 'amountOff'
    | 'bogo'
    | 'banner'
    | 'status'
    | 'validFrom'
    | 'validUntil'
    | 'listingId'
  >
>;

export type UpdateShopOfferPayload = CreateShopOfferPayload &
  Partial<Pick<ShopOffer, 'appliesToAllBusinesses' | 'businessIds'>>;

export const offerApi = {
  async listMyOffers(): Promise<ApiResponse<ShopOffer[]>> {
    return apiClient.get<ShopOffer[]>('/offers/my');
  },

  async createOffer(payload: CreateShopOfferPayload): Promise<ApiResponse<ShopOffer>> {
    return apiClient.post<ShopOffer>('/offers', payload);
  },

  async updateOffer(offerId: string, payload: UpdateShopOfferPayload): Promise<ApiResponse<ShopOffer>> {
    return apiClient.put<ShopOffer>(`/offers/${offerId}`, payload);
  },

  async deleteOffer(offerId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/offers/${offerId}`);
  },
};
