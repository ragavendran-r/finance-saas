import apiClient from './client';
import type { BudgetProgress, IncomeVsExpenses, NetWorth, SpendingByCategory } from '../types';

export const reportsApi = {
  spendingByCategory: async (date_from: string, date_to: string): Promise<SpendingByCategory[]> => {
    const { data } = await apiClient.get<SpendingByCategory[]>('/reports/spending-by-category', {
      params: { date_from, date_to },
    });
    return data;
  },

  incomeVsExpenses: async (date_from: string, date_to: string): Promise<IncomeVsExpenses> => {
    const { data } = await apiClient.get<IncomeVsExpenses>('/reports/income-vs-expenses', {
      params: { date_from, date_to },
    });
    return data;
  },

  netWorth: async (): Promise<NetWorth> => {
    const { data } = await apiClient.get<NetWorth>('/reports/net-worth');
    return data;
  },

  budgetVsActual: async (date_from: string, date_to: string): Promise<BudgetProgress[]> => {
    const { data } = await apiClient.get<BudgetProgress[]>('/reports/budget-vs-actual', {
      params: { date_from, date_to },
    });
    return data;
  },
};
