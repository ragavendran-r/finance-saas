import apiClient from './client';
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types';

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await apiClient.get<Category[]>('/categories');
    return data;
  },

  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    const { data } = await apiClient.post<Category>('/categories', payload);
    return data;
  },

  update: async (id: string, payload: UpdateCategoryPayload): Promise<Category> => {
    const { data } = await apiClient.patch<Category>(`/categories/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
