import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportsApi } from '../api/reports';
import { transactionsApi } from '../api/transactions';
import { budgetsApi } from '../api/budgets';
import { categoriesApi } from '../api/categories';
import { accountsApi } from '../api/accounts';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { formatCurrency } from '../utils/format';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#f97316', '#14b8a6', '#ef4444', '#84cc16',
];

const now = new Date();
const dateFrom = format(startOfMonth(now), 'yyyy-MM-dd');
const dateTo = format(endOfMonth(now), 'yyyy-MM-dd');

export default function Dashboard() {
  const { data: netWorth, isLoading: nwLoading } = useQuery({
    queryKey: ['reports', 'net-worth'],
    queryFn: reportsApi.netWorth,
  });

  const { data: incomeExpenses, isLoading: ieLoading } = useQuery({
    queryKey: ['reports', 'income-vs-expenses', dateFrom, dateTo],
    queryFn: () => reportsApi.incomeVsExpenses(dateFrom, dateTo),
  });

  const { data: recentTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => transactionsApi.list({ limit: 5 }),
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const currency = accounts?.[0]?.currency || 'USD';

  const { data: spending, isLoading: spendLoading } = useQuery({
    queryKey: ['reports', 'spending-by-category', dateFrom, dateTo],
    queryFn: () => reportsApi.spendingByCategory(dateFrom, dateTo),
  });

  const isLoading = nwLoading || ieLoading || txLoading || budgetsLoading || spendLoading;

  if (isLoading) return <LoadingSpinner />;

  const pieData = (spending || [])
    .filter((s) => s.total > 0)
    .map((s) => ({
      name: (s.category?.name) || 'Uncategorized',
      value: s.total,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(now, 'MMMM yyyy')} overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-indigo-200 text-sm font-medium">Net Worth</span>
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(netWorth?.total ?? 0, currency)}</p>
          <p className="text-indigo-200 text-xs mt-2">Across all accounts</p>
        </div>

        {/* Income */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Income This Month</span>
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(incomeExpenses?.income ?? 0, currency)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-green-600 font-medium">Credits</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Expenses This Month</span>
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(incomeExpenses?.expenses ?? 0, currency)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-red-500 font-medium">Debits</span>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          {(recentTransactions ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No transactions yet</p>
          ) : (
            <ul className="space-y-3">
              {(recentTransactions ?? []).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.type.toUpperCase() === 'CREDIT' ? 'bg-green-100' : 'bg-red-50'
                      }`}
                    >
                      <DollarSign
                        className={`w-4 h-4 ${tx.type.toUpperCase() === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(tx.date), 'MMM d')} •{' '}
                        {categories?.find(c => c.id === tx.category_id)?.name || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                      tx.type.toUpperCase() === 'CREDIT' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {tx.type.toUpperCase() === 'CREDIT' ? '+' : '-'}
                    {formatCurrency(tx.amount, accounts?.find(a => a.id === tx.account_id)?.currency || currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Spending Pie Chart */}
        <Card title="Spending by Category">
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No spending data this month</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Budget Overview */}
      {(budgets ?? []).length > 0 && (
        <Card title="Budget Overview">
          <div className="space-y-4">
            {(budgets ?? []).slice(0, 5).map((budget) => (
              <BudgetProgressRow key={budget.id} budgetId={budget.id} categories={categories ?? []} currency={currency} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function BudgetProgressRow({ budgetId, categories, currency }: { budgetId: string; categories: import('../types').Category[]; currency: string }) {
  const { data: progress } = useQuery({
    queryKey: ['budget-progress', budgetId],
    queryFn: () => budgetsApi.progress(budgetId),
  });

  if (!progress) return null;

  const pct = Math.min(progress.percent_used, 100);
  const isOver = progress.percent_used > 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {categories?.find(c => c.id === progress.budget.category_id)?.name || 'Budget'}
          </span>
          <Badge variant={isOver ? 'red' : 'gray'}>
            {progress.budget.period}
          </Badge>
        </div>
        <span className="text-xs text-gray-500">
          {formatCurrency(progress.spent, currency)} / {formatCurrency(progress.budgeted, currency)}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
