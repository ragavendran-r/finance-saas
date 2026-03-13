import apiClient from './client';
import type { Budget, BudgetProgress, CreateBudgetPayload, UpdateBudgetPayload } from '../types';

export const budgetsApi = {
  list: async (): Promise<Budget[]> => {
    const { data } = await apiClient.get<Budget[]>('/budgets');
    return data;
  },

  get: async (id: string): Promise<Budget> => {
    const { data } = await apiClient.get<Budget>(`/budgets/${id}`);
    return data;
  },

  create: async (payload: CreateBudgetPayload): Promise<Budget> => {
    const { data } = await apiClient.post<Budget>('/budgets', payload);
    return data;
  },

  update: async (id: string, payload: UpdateBudgetPayload): Promise<Budget> => {
    const { data } = await apiClient.patch<Budget>(`/budgets/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/budgets/${id}`);
  },

  progress: async (id: string): Promise<BudgetProgress> => {
    const { data } = await apiClient.get<BudgetProgress>(`/budgets/${id}/progress`);
    return data;
  },
};
