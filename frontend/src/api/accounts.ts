import apiClient from './client';
import type { Account, CreateAccountPayload, UpdateAccountPayload } from '../types';

export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const { data } = await apiClient.get<Account[]>('/accounts');
    return data;
  },

  get: async (id: string): Promise<Account> => {
    const { data } = await apiClient.get<Account>(`/accounts/${id}`);
    return data;
  },

  create: async (payload: CreateAccountPayload): Promise<Account> => {
    const { data } = await apiClient.post<Account>('/accounts', payload);
    return data;
  },

  update: async (id: string, payload: UpdateAccountPayload): Promise<Account> => {
    const { data } = await apiClient.patch<Account>(`/accounts/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },
};
