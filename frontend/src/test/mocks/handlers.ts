import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8000/api/v1'

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'admin' as const,
  is_active: true,
  tenant_id: 'tenant-1',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockAccount = {
  id: 'acc-1',
  name: 'Main Checking',
  type: 'CHECKING' as const,
  currency: 'USD',
  balance: 1000,
  institution_name: 'Chase',
  is_active: true,
  tenant_id: 'tenant-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockCategory = {
  id: 'cat-1',
  name: 'Food & Dining',
  icon: '🍔',
  color: '#ef4444',
  tenant_id: 'tenant-1',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockTransaction = {
  id: 'tx-1',
  account_id: 'acc-1',
  category_id: 'cat-1',
  category: mockCategory,
  amount: 50.0,
  type: 'DEBIT' as const,
  description: 'Grocery shopping',
  merchant: 'Whole Foods',
  date: '2024-01-15T00:00:00Z',
  is_recurring: false,
  tenant_id: 'tenant-1',
  created_at: '2024-01-15T00:00:00Z',
}

export const mockBudget = {
  id: 'budget-1',
  category_id: 'cat-1',
  category: mockCategory,
  amount: 500,
  period: 'MONTHLY' as const,
  start_date: '2024-01-01T00:00:00Z',
  tenant_id: 'tenant-1',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockBudgetProgress = {
  budget: mockBudget,
  budgeted: 500,
  spent: 200,
  remaining: 300,
  percent_used: 40,
}

export const mockNetWorth = {
  by_account_type: { CHECKING: 1000, SAVINGS: 5000 },
  total: 6000,
}

export const mockIncomeVsExpenses = {
  income: 3000,
  expenses: 1500,
  net: 1500,
}

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({ access_token: 'test-token', token_type: 'bearer' })
  ),
  http.post(`${BASE}/auth/register`, () => HttpResponse.json(mockUser, { status: 201 })),
  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({})),
  http.get(`${BASE}/auth/me`, () => HttpResponse.json(mockUser)),

  // Accounts
  http.get(`${BASE}/accounts`, () => HttpResponse.json([mockAccount])),
  http.post(`${BASE}/accounts`, () => HttpResponse.json(mockAccount, { status: 201 })),
  http.patch(`${BASE}/accounts/:id`, () => HttpResponse.json(mockAccount)),
  http.delete(`${BASE}/accounts/:id`, () => new HttpResponse(null, { status: 204 })),

  // Categories
  http.get(`${BASE}/categories`, () => HttpResponse.json([mockCategory])),
  http.post(`${BASE}/categories`, () => HttpResponse.json(mockCategory, { status: 201 })),
  http.patch(`${BASE}/categories/:id`, () => HttpResponse.json(mockCategory)),
  http.delete(`${BASE}/categories/:id`, () => new HttpResponse(null, { status: 204 })),

  // Transactions
  http.get(`${BASE}/transactions`, () => HttpResponse.json([mockTransaction])),
  http.post(`${BASE}/transactions`, () => HttpResponse.json(mockTransaction, { status: 201 })),
  http.patch(`${BASE}/transactions/:id`, () => HttpResponse.json(mockTransaction)),
  http.delete(`${BASE}/transactions/:id`, () => new HttpResponse(null, { status: 204 })),

  // Budgets
  http.get(`${BASE}/budgets`, () => HttpResponse.json([mockBudget])),
  http.post(`${BASE}/budgets`, () => HttpResponse.json(mockBudget, { status: 201 })),
  http.patch(`${BASE}/budgets/:id`, () => HttpResponse.json(mockBudget)),
  http.delete(`${BASE}/budgets/:id`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${BASE}/budgets/:id/progress`, () => HttpResponse.json(mockBudgetProgress)),

  // Reports
  http.get(`${BASE}/reports/net-worth`, () => HttpResponse.json(mockNetWorth)),
  http.get(`${BASE}/reports/income-vs-expenses`, () => HttpResponse.json(mockIncomeVsExpenses)),
  http.get(`${BASE}/reports/spending-by-category`, () =>
    HttpResponse.json([{ category: mockCategory, total: 200 }])
  ),
  http.get(`${BASE}/reports/budget-vs-actual`, () => HttpResponse.json([mockBudgetProgress])),

  // Users
  http.get(`${BASE}/users`, () => HttpResponse.json([mockUser])),
]
