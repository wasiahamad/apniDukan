import { apiClient, type ApiResponse } from "../apiClient";

export type AdminAboutCard = {
  title: string;
  desc: string;
};

export type AdminAboutPageContent = {
  heading: string;
  intro: string;
  cards: AdminAboutCard[];
  body: string;
  closing: string;
};

export const aboutAdminApi = {
  get(): Promise<ApiResponse<AdminAboutPageContent>> {
    return apiClient.get<AdminAboutPageContent>("/about/admin", true);
  },

  update(input: AdminAboutPageContent): Promise<ApiResponse<AdminAboutPageContent>> {
    return apiClient.put<AdminAboutPageContent>("/about/admin", input, true);
  },
};
