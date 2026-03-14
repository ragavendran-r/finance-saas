import apiClient from './client';

export interface SpendRecommendation {
  title: string;
  category: string | null;
  type: 'reduce' | 'reallocate' | 'save' | 'invest';
  priority: 'high' | 'medium' | 'low';
  monthly_impact: number | null;
  description: string;
}

export interface OverBudgetCategory {
  category: string;
  budgeted: number;
  spent: number;
  overspend: number;
}

export interface BudgetAdvice {
  category: string;
  current_budget: number | null;
  avg_monthly_spend: number;
  suggested_budget: number;
  verdict: 'increase' | 'decrease' | 'on_track' | 'set_budget';
  reason: string;
}

export interface SpendAdvisoryResult {
  monthly_summary: {
    avg_income: number;
    avg_expenses: number;
    avg_savings: number;
    savings_rate_pct: number;
  };
  annual_projection: {
    projected_income: number;
    projected_expenses: number;
    projected_savings: number;
  };
  over_budget_categories: OverBudgetCategory[];
  budget_advice: BudgetAdvice[];
  recommendations: SpendRecommendation[];
  summary: string;
  disclaimer: string;
}

export interface SpendAdvisoryResponse {
  llm_provider: string;
  date_from: string;
  date_to: string;
  result: SpendAdvisoryResult;
}

export const spendAdvisoryApi = {
  getRecommendations: async (dateFrom: string, dateTo: string): Promise<SpendAdvisoryResponse> => {
    const { data } = await apiClient.post<SpendAdvisoryResponse>('/spend-advisory/recommendations', {
      date_from: dateFrom,
      date_to: dateTo,
    });
    return data;
  },
};
