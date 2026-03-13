import { apiClient } from './client';

export interface TaxRecommendation {
  section: string;
  title: string;
  instruments: string[];
  max_deduction: number;
  potential_tax_saving: number;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export interface TaxResult {
  regime_recommendation: 'new' | 'old';
  regime_reasoning: string;
  estimated_tax: {
    new_regime?: number;
    old_regime_before_planning?: number;
    old_regime_after_planning?: number;
  };
  recommendations: TaxRecommendation[];
  total_potential_saving: number;
  summary: string;
  disclaimer: string;
}

export interface TaxAdvisoryResponse {
  annual_income_used: number;
  llm_provider: string;
  result: TaxResult;
}

export interface TaxAdvisoryRequest {
  annual_income?: number;
  age?: number;
  regime_preference: 'new' | 'old';
}

export const taxAdvisoryApi = {
  getRecommendations: (payload: TaxAdvisoryRequest): Promise<TaxAdvisoryResponse> =>
    apiClient.post('/tax-advisory/recommendations', payload),
};
