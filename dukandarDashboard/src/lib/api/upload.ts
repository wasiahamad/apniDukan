/**
 * Upload API Services
 */

import { apiClient, type ApiResponse } from '../api';

export type UploadImageResponse = {
  url: string;
  alt?: string;
};

export const uploadApi = {
  async uploadImage(file: File, folder?: string): Promise<ApiResponse<UploadImageResponse>> {
    const form = new FormData();
    form.append('file', file);
    if (folder) form.append('folder', folder);

    return apiClient.postForm<UploadImageResponse>('/upload/image', form);
  },
};
