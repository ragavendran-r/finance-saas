import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Sparkles, TrendingDown, TrendingUp, ArrowRightLeft, PiggyBank } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { reportsApi } from '../api/reports';
import { accountsApi } from '../api/accounts';
import { useCategories } from '../hooks/useCategories';
import { spendAdvisoryApi } from '../api/spendAdvisory';
import type { SpendAdvisoryResult, SpendRecommendation, BudgetAdvice } from '../api/spendAdvisory';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/format';
import type { AccountType } from '../types';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#f97316', '#14b8a6', '#ef4444', '#84cc16',
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT: 'Credit Cards',
  INVESTMENT: 'Investments',
  CASH: 'Cash',
};

export default function Reports() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const { data: categories } = useCategories();
  const currency = accounts?.[0]?.currency || 'USD';

  const { data: spending, isLoading: spendLoading } = useQuery({
    queryKey: ['reports', 'spending', dateFrom, dateTo],
    queryFn: () => reportsApi.spendingByCategory(dateFrom, dateTo),
  });

  const { data: incomeExpenses, isLoading: ieLoading } = useQuery({
    queryKey: ['reports', 'income-vs-expenses', dateFrom, dateTo],
    queryFn: () => reportsApi.incomeVsExpenses(dateFrom, dateTo),
  });

  const { data: netWorth, isLoading: nwLoading } = useQuery({
    queryKey: ['reports', 'net-worth'],
    queryFn: reportsApi.netWorth,
  });

  const { data: budgetVsActual, isLoading: bvaLoading } = useQuery({
    queryKey: ['reports', 'budget-vs-actual', dateFrom, dateTo],
    queryFn: () => reportsApi.budgetVsActual(dateFrom, dateTo),
  });

  const spendAdvisoryMutation = useMutation({
    mutationFn: () => spendAdvisoryApi.getRecommendations(dateFrom, dateTo),
  });

  const setPreset = (months: number) => {
    const d = months === 0 ? now : subMonths(now, months - 1);
    setDateFrom(format(startOfMonth(d), 'yyyy-MM-dd'));
    setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
  };

  const pieData = (spending || [])
    .filter((s) => s.total > 0)
    .map((s) => ({ name: s.category?.name || 'Uncategorized', value: s.total }));

  const barData = [
    {
      name: 'Summary',
      Income: incomeExpenses?.income ?? 0,
      Expenses: incomeExpenses?.expenses ?? 0,
      Net: incomeExpenses?.net ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze your financial data</p>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPreset(0)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setPreset(3)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setPreset(6)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              Last 6 Months
            </button>
            <button
              onClick={() => setPreset(12)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              Last Year
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Income vs Expenses Summary Cards */}
      {ieLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(incomeExpenses?.income ?? 0, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">
              {formatCurrency(incomeExpenses?.expenses ?? 0, currency)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Net</p>
            <p
              className={`text-2xl font-bold ${
                (incomeExpenses?.net ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {formatCurrency(incomeExpenses?.net ?? 0, currency)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category Pie */}
        <Card title="Spending by Category">
          {spendLoading ? (
            <LoadingSpinner />
          ) : pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No spending data for this period</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {formatCurrency(item.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Income vs Expenses Bar Chart */}
        <Card title="Income vs Expenses">
          {ieLoading ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Net Worth Breakdown */}
      <Card title="Net Worth Breakdown">
        {nwLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
              <span className="font-semibold text-indigo-800">Total Net Worth</span>
              <span className="text-xl font-bold text-indigo-900">
                {formatCurrency(netWorth?.total ?? 0, currency)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(netWorth?.by_account_type ?? {}).map(([type, amount]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-sm text-gray-600">
                    {ACCOUNT_TYPE_LABELS[type as AccountType] || type}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      (amount as number) < 0 ? 'text-red-600' : 'text-gray-800'
                    }`}
                  >
                    {formatCurrency(amount as number, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Budget vs Actual */}
      <Card title="Budget vs Actual">
        {bvaLoading ? (
          <LoadingSpinner />
        ) : (budgetVsActual ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No budget data for this period</p>
        ) : (
          <div className="space-y-4">
            {(budgetVsActual ?? []).map((bp, i) => {
              const pct = Math.min(bp.percent_used, 100);
              const isOver = bp.percent_used > 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {categories?.find(c => c.id === bp.budget.category_id)?.name || 'Budget'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {formatCurrency(bp.spent, currency)} / {formatCurrency(bp.budgeted, currency)}
                      </span>
                      {isOver && (
                        <span className="text-xs font-medium text-red-600">Over!</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-red-500' : bp.percent_used > 80 ? 'bg-yellow-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* AI Spend Recommendations */}
      <Card title="AI Spend Recommendations">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Get personalised monthly and annual spending recommendations based on your income, expenses, and budgets for the selected period.
            </p>
            <button
              onClick={() => spendAdvisoryMutation.mutate()}
              disabled={spendAdvisoryMutation.isPending}
              className="ml-4 flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {spendAdvisoryMutation.isPending ? 'Analysing…' : 'Get Recommendations'}
            </button>
          </div>

          {spendAdvisoryMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">Failed to get recommendations. Please try again.</p>
          )}

          {spendAdvisoryMutation.data && (
            <SpendAdvisoryPanel result={spendAdvisoryMutation.data.result} currency={currency} provider={spendAdvisoryMutation.data.llm_provider} />
          )}
        </div>
      </Card>
    </div>
  );
}

const VERDICT_BADGE: Record<BudgetAdvice['verdict'], string> = {
  increase:   'bg-red-100 text-red-700',
  decrease:   'bg-blue-100 text-blue-700',
  on_track:   'bg-green-100 text-green-700',
  set_budget: 'bg-yellow-100 text-yellow-700',
};

const VERDICT_LABEL: Record<BudgetAdvice['verdict'], string> = {
  increase:   '↑ Increase',
  decrease:   '↓ Decrease',
  on_track:   '✓ On track',
  set_budget: '+ Set budget',
};

const TYPE_CONFIG: Record<SpendRecommendation['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  reduce:     { icon: <TrendingDown className="w-4 h-4" />,    color: 'text-red-600',    bg: 'bg-red-50' },
  reallocate: { icon: <ArrowRightLeft className="w-4 h-4" />,  color: 'text-blue-600',   bg: 'bg-blue-50' },
  save:       { icon: <PiggyBank className="w-4 h-4" />,       color: 'text-green-600',  bg: 'bg-green-50' },
  invest:     { icon: <TrendingUp className="w-4 h-4" />,      color: 'text-purple-600', bg: 'bg-purple-50' },
};

const PRIORITY_BADGE: Record<SpendRecommendation['priority'], string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};

function SpendAdvisoryPanel({ result, currency, provider }: { result: SpendAdvisoryResult; currency: string; provider: string }) {
  const ms = result.monthly_summary;
  const ap = result.annual_projection;

  return (
    <div className="space-y-6">
      {/* Monthly / Annual summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Avg Monthly Income',   value: ms.avg_income,    color: 'text-green-600' },
          { label: 'Avg Monthly Expenses', value: ms.avg_expenses,  color: 'text-red-500' },
          { label: 'Avg Monthly Savings',  value: ms.avg_savings,   color: ms.avg_savings >= 0 ? 'text-indigo-600' : 'text-red-500' },
          { label: 'Savings Rate',         value: null,             color: ms.savings_rate_pct >= 0 ? 'text-indigo-600' : 'text-red-500', pct: ms.savings_rate_pct },
        ].map((card) => (
          <div key={card.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-base font-bold ${card.color}`}>
              {card.pct !== undefined ? `${card.pct.toFixed(1)}%` : formatCurrency(card.value!, currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Annual projection */}
      <div className="bg-indigo-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Annual Projection</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500">Projected Income</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(ap.projected_income, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Projected Expenses</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(ap.projected_expenses, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Projected Savings</p>
            <p className={`text-sm font-bold ${ap.projected_savings >= 0 ? 'text-indigo-700' : 'text-red-500'}`}>
              {formatCurrency(ap.projected_savings, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Over-budget categories */}
      {result.over_budget_categories?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Over Budget</p>
          <div className="space-y-2">
            {result.over_budget_categories.map((ob, i) => (
              <div key={i} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">{ob.category}</span>
                <span className="text-sm text-red-600 font-semibold">
                  {formatCurrency(ob.spent, currency)} / {formatCurrency(ob.budgeted, currency)}
                  <span className="ml-2 text-xs">(+{formatCurrency(ob.overspend, currency)} over)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Advice */}
      {result.budget_advice?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Budget Allocation Advice</p>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5">Category</th>
                  <th className="text-right px-4 py-2.5">Current Budget</th>
                  <th className="text-right px-4 py-2.5">Avg Spend</th>
                  <th className="text-right px-4 py-2.5">Suggested</th>
                  <th className="text-center px-4 py-2.5">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.budget_advice.map((row: BudgetAdvice, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-700">{row.category}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {row.current_budget != null ? formatCurrency(row.current_budget, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(row.avg_monthly_spend, currency)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-indigo-700">{formatCurrency(row.suggested_budget, currency)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${VERDICT_BADGE[row.verdict]}`}>
                        {VERDICT_LABEL[row.verdict]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Reasons */}
          <div className="mt-3 space-y-1.5">
            {result.budget_advice.filter((r: BudgetAdvice) => r.verdict !== 'on_track').map((row: BudgetAdvice, i: number) => (
              <p key={i} className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{row.category}:</span> {row.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Recommendations</p>
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => {
              const cfg = TYPE_CONFIG[rec.type] ?? TYPE_CONFIG.save;
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{rec.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rec.monthly_impact != null && rec.monthly_impact > 0 && (
                        <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          Save {formatCurrency(rec.monthly_impact, currency)}/mo
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[rec.priority]}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  {rec.category && <p className="text-xs text-gray-400 mb-1 ml-9">{rec.category}</p>}
                  <p className="text-sm text-gray-600 ml-9">{rec.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {result.summary && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Summary</p>
          <p className="text-sm text-gray-600">{result.summary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
        <span>Powered by {provider}</span>
        {result.disclaimer && <span className="max-w-lg text-right">{result.disclaimer}</span>}
      </div>
    </div>
  );
}
