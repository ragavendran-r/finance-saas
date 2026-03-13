import apiClient from './client';
import type {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionFilters,
} from '../types';

export const transactionsApi = {
  list: async (filters?: TransactionFilters): Promise<Transaction[]> => {
    const { data } = await apiClient.get<Transaction[]>('/transactions', { params: filters });
    return data;
  },

  get: async (id: string): Promise<Transaction> => {
    const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
    return data;
  },

  create: async (payload: CreateTransactionPayload): Promise<Transaction> => {
    const { data } = await apiClient.post<Transaction>('/transactions', payload);
    return data;
  },

  update: async (id: string, payload: UpdateTransactionPayload): Promise<Transaction> => {
    const { data } = await apiClient.patch<Transaction>(`/transactions/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};
