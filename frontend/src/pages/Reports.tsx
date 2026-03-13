import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
                      {bp.budget.category?.name || 'Budget'}
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
    </div>
  );
}
