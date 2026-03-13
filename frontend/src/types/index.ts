// Auth & User
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member';
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  tenant_name: string;
  tenant_slug: string;
  email: string;
  password: string;
  full_name: string;
}

// Accounts
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'CASH';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  institution_name?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  institution_name?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  institution_name?: string;
  is_active?: boolean;
}

// Categories
export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  parent?: Category;
  tenant_id: string;
  created_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  icon?: string;
  color?: string;
}

// Transactions
export type TransactionType = 'DEBIT' | 'CREDIT';

export interface Transaction {
  id: string;
  account_id: string;
  account?: Account;
  category_id?: string;
  category?: Category;
  amount: number;
  type: TransactionType;
  description: string;
  merchant?: string;
  date: string;
  is_recurring: boolean;
  notes?: string;
  tenant_id: string;
  created_at: string;
}

export interface CreateTransactionPayload {
  account_id: string;
  category_id?: string;
  amount: number;
  type: TransactionType;
  description: string;
  merchant?: string;
  date: string;
  is_recurring: boolean;
  notes?: string;
}

export interface UpdateTransactionPayload {
  category_id?: string;
  description?: string;
  merchant?: string;
  notes?: string;
}

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Budgets
export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Budget {
  id: string;
  category_id: string;
  category?: Category;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string;
  tenant_id: string;
  created_at: string;
}

export interface CreateBudgetPayload {
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date?: string;
}

export interface UpdateBudgetPayload {
  amount?: number;
  end_date?: string;
}

export interface BudgetProgress {
  budget: Budget;
  budgeted: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

// Reports
export interface SpendingByCategory {
  category: Category | null;
  total: number;
}

export interface IncomeVsExpenses {
  income: number;
  expenses: number;
  net: number;
}

export interface NetWorth {
  by_account_type: Record<AccountType, number>;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
