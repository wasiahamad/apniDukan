import { apiClient, type ApiResponse } from "../apiClient";

export type UploadImageResponse = {
  url: string;
  alt?: string;
};

export const uploadAdminApi = {
  async uploadImage(file: File, input?: { folder?: string }): Promise<ApiResponse<UploadImageResponse>> {
    const form = new FormData();
    form.append("file", file);
    if (input?.folder) form.append("folder", input.folder);

    return apiClient.postForm<UploadImageResponse>("/upload/image", form, true);
  },
};
