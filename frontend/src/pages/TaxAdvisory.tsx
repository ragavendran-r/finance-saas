import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sparkles,
  TrendingDown,
  IndianRupee,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { taxAdvisoryApi, type TaxAdvisoryRequest, type TaxRecommendation } from '../api/taxAdvisory';
import { Button } from '../components/Button';
import { FormField, Input, Select } from '../components/FormField';
import { ErrorAlert } from '../components/ErrorAlert';
import { formatCurrency } from '../utils/format';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

const schema = z.object({
  annual_income: z.preprocess(emptyToUndefined, z.number().min(0).optional()),
  age: z.preprocess(emptyToUndefined, z.number().min(1).max(120).optional()),
  regime_preference: z.enum(['new', 'old']),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_STYLES = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-green-50 border-green-200 text-green-700',
};

const PRIORITY_LABEL = { high: 'High Priority', medium: 'Medium', low: 'Low' };

function RecommendationCard({ rec }: { rec: TaxRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
              {rec.section}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[rec.priority]}`}
            >
              {PRIORITY_LABEL[rec.priority]}
            </span>
          </div>
          <p className="font-semibold text-gray-800">{rec.title}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">Save up to</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(rec.potential_tax_saving, 'INR')}
          </p>
        </div>
      </div>

      {rec.instruments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {rec.instruments.map((inst) => (
            <span
              key={inst}
              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium"
            >
              {inst}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <p className="text-xs text-gray-500">
          Max deduction: <span className="font-semibold">{formatCurrency(rec.max_deduction, 'INR')}</span>
        </p>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          {expanded ? 'Less' : 'More'}{' '}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{rec.description}</p>
      )}
    </div>
  );
}

export default function TaxAdvisory() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Income projection from backend (avg monthly credit × 12, based on months with actual credits)
  const { data: projection, isLoading: projectionLoading } = useQuery({
    queryKey: ['tax-advisory', 'income-projection'],
    queryFn: taxAdvisoryApi.getIncomeProjection,
  });
  const avgMonthlyCredit = projection?.avg_monthly_credit ?? 0;
  const derivedIncome = projection?.annual_projection ?? 0;
  const monthsWithCredits = projection?.months_with_credits ?? 0;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { regime_preference: 'new' },
  });

  const mutation = useMutation({
    mutationFn: (values: TaxAdvisoryRequest) => taxAdvisoryApi.getRecommendations(values),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      annual_income: values.annual_income || undefined,
      age: values.age || undefined,
      regime_preference: values.regime_preference,
    });
  };

  const rawResult = mutation.data?.result;

  // If the backend fallback put JSON into summary, recover it on the frontend
  const result = useMemo(() => {
    if (!rawResult) return null;
    if ((rawResult.recommendations?.length ?? 0) > 0) return rawResult;
    const summary = rawResult.summary?.trim() ?? '';
    if (summary.startsWith('{') || summary.startsWith('```')) {
      try {
        const cleaned = summary.replace(/```json\n?|```/g, '');
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end > start) {
          const parsed = JSON.parse(cleaned.slice(start, end + 1));
          return { ...rawResult, ...parsed };
        }
      } catch { /* fall through */ }
    }
    return rawResult;
  }, [rawResult]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          Tax Recommendations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalised Indian tax-saving recommendations for FY 2025-26 powered by AI.
        </p>
      </div>

      {/* Derived income banner */}
      <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-indigo-600" />
        </div>
        {projectionLoading ? (
          <p className="text-sm text-indigo-400">Calculating from transactions…</p>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-500 font-medium mb-0.5">Projected Annual Income (FY 2025-26)</p>
            <p className="text-xl font-bold text-indigo-700">{formatCurrency(derivedIncome, 'INR')}</p>
            <p className="text-xs text-indigo-400 mt-0.5">
              {formatCurrency(avgMonthlyCredit, 'INR')} avg/month × 12
              &nbsp;·&nbsp; {monthsWithCredits} month{monthsWithCredits !== 1 ? 's' : ''} with credits
            </p>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Your Details</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Preferred Regime" error={errors.regime_preference?.message} required>
              <Select error={!!errors.regime_preference} {...register('regime_preference')}>
                <option value="new">New Regime (Default)</option>
                <option value="old">Old Regime</option>
              </Select>
            </FormField>
            <FormField label="Age" error={errors.age?.message}>
              <Input
                type="number"
                placeholder="Optional"
                min="1"
                max="120"
                error={!!errors.age}
                {...register('age')}
              />
            </FormField>
          </div>

          {/* Advanced income override */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvanced ? 'Hide income override' : 'Override income manually'}
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showAdvanced && (
              <div className="mt-3 max-w-xs">
                <FormField label="Annual Income (₹)" error={errors.annual_income?.message}>
                  <Input
                    type="number"
                    placeholder={`Auto: ${formatCurrency(derivedIncome, 'INR')}`}
                    min="0"
                    step="1000"
                    error={!!errors.annual_income}
                    {...register('annual_income')}
                  />
                </FormField>
              </div>
            )}
          </div>

          {mutation.error && (
            <ErrorAlert message="Failed to get recommendations. Check that your LLM API key is configured." />
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={mutation.isPending}
              leftIcon={mutation.isPending ? undefined : <Sparkles className="w-4 h-4" />}
            >
              {mutation.isPending ? 'Analysing...' : 'Get Recommendations'}
            </Button>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {mutation.isPending && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
          <p className="text-sm">Consulting AI advisor on Indian tax laws…</p>
        </div>
      )}

      {/* Results */}
      {result && !mutation.isPending && (
        <div className="space-y-5">
          {/* Income & Regime Banner */}
          <div className="bg-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-indigo-200 text-xs font-medium mb-1">Annual Income Analysed</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(mutation.data!.annual_income_used, 'INR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-indigo-200 text-xs font-medium mb-1">Recommended Regime</p>
                <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold capitalize">
                  {result.regime_recommendation} Tax Regime
                </span>
              </div>
            </div>
            {result.regime_reasoning && (
              <p className="mt-3 text-indigo-100 text-sm leading-relaxed">{result.regime_reasoning}</p>
            )}
          </div>

          {/* Tax Comparison */}
          {result.estimated_tax && Object.keys(result.estimated_tax).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {result.estimated_tax.new_regime !== undefined && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 mb-1">New Regime Tax</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(result.estimated_tax.new_regime, 'INR')}
                  </p>
                </div>
              )}
              {result.estimated_tax.old_regime_before_planning !== undefined && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 mb-1">Old Regime (Before Planning)</p>
                  <p className="text-2xl font-bold text-red-500">
                    {formatCurrency(result.estimated_tax.old_regime_before_planning, 'INR')}
                  </p>
                </div>
              )}
              {result.estimated_tax.old_regime_after_planning !== undefined && (
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 bg-green-50">
                  <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Old Regime (After Planning)
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(result.estimated_tax.old_regime_after_planning, 'INR')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Total Saving */}
          {result.total_potential_saving > 0 && (
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Total Potential Tax Saving</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(result.total_potential_saving, 'INR')}
                </p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">
                Recommendations ({result.recommendations.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {result.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} />
                ))}
              </div>
            </div>
          )}

          {/* Summary — only show if it's plain text, not raw JSON/fences */}
          {result.summary && !result.summary.trim().startsWith('{') && !result.summary.trim().startsWith('```') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Summary
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}

          {/* Disclaimer */}
          {result.disclaimer && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{result.disclaimer}</p>
            </div>
          )}

          {/* Provider badge */}
          <p className="text-xs text-gray-400 text-center">
            Powered by {mutation.data!.llm_provider} · For FY 2025-26 · Not legal or financial advice
          </p>
        </div>
      )}
    </div>
  );
}
