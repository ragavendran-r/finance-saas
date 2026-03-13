import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { transactionsApi } from '../api/transactions';
import { accountsApi } from '../api/accounts';
import { categoriesApi } from '../api/categories';
import type { Transaction } from '../types';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { FormField, Input, Select, Textarea } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { formatCurrency, formatDate } from '../utils/format';

const PAGE_SIZE = 20;

const txSchema = z.object({
  account_id: z.string().min(1, 'Account required'),
  category_id: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['DEBIT', 'CREDIT']),
  description: z.string().min(1, 'Description required'),
  merchant: z.string().optional(),
  date: z.string().min(1, 'Date required'),
  is_recurring: z.boolean().default(false),
  notes: z.string().optional(),
});

type TxValues = z.infer<typeof txSchema>;

export default function Transactions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', { search, filterAccount, filterCategory, page }],
    queryFn: () =>
      transactionsApi.list({
        search: search || undefined,
        account_id: filterAccount || undefined,
        category_id: filterCategory || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const createForm = useForm<TxValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(txSchema) as any,
    defaultValues: {
      type: 'DEBIT',
      date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editForm = useForm<TxValues>({ resolver: zodResolver(txSchema) as any });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setCreateOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TxValues> }) =>
      transactionsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setEditTx(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setDeleteTx(null);
    },
  });

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    editForm.reset({
      account_id: tx.account_id,
      category_id: tx.category_id || '',
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      merchant: tx.merchant || '',
      date: tx.date.split('T')[0],
      is_recurring: tx.is_recurring,
      notes: tx.notes || '',
    });
  };

  const txList = transactions ?? [];
  const hasPrev = page > 0;
  const hasNext = txList.length === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Track your income and expenses</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterAccount}
            onChange={(e) => { setFilterAccount(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Accounts</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : txList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No transactions found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Merchant</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Category</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Account</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txList.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              tx.type.toUpperCase() === 'CREDIT' ? 'bg-green-100' : 'bg-red-50'
                            }`}
                          >
                            {tx.type.toUpperCase() === 'CREDIT' ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                            {tx.description}
                          </span>
                          {tx.is_recurring && (
                            <Badge variant="blue">Recurring</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                        {tx.merchant || '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(() => { const cat = categories?.find(c => c.id === tx.category_id); return cat ? <Badge variant="gray">{cat.name}</Badge> : <span className="text-xs text-gray-400">Uncategorized</span>; })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                        {accounts?.find(a => a.id === tx.account_id)?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={`text-sm font-semibold ${
                            tx.type.toUpperCase() === 'CREDIT' ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {tx.type.toUpperCase() === 'CREDIT' ? '+' : '-'}
                          {formatCurrency(tx.amount, accounts?.find(a => a.id === tx.account_id)?.currency || 'USD')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(tx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTx(tx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Page {page + 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrev}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Transaction" size="lg">
        <form
          onSubmit={createForm.handleSubmit((v) => createMutation.mutate({ ...v, category_id: v.category_id || undefined } as TxValues))}
          className="space-y-4"
        >
          {createMutation.error && <ErrorAlert message="Failed to create transaction." />}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Account" error={createForm.formState.errors.account_id?.message} required>
              <Select error={!!createForm.formState.errors.account_id} {...createForm.register('account_id')}>
                <option value="">Select account</option>
                {(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Type" error={createForm.formState.errors.type?.message} required>
              <Select error={!!createForm.formState.errors.type} {...createForm.register('type')}>
                <option value="DEBIT">Debit (Expense)</option>
                <option value="CREDIT">Credit (Income)</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" error={createForm.formState.errors.amount?.message} required>
              <Input type="number" step="0.01" min="0" error={!!createForm.formState.errors.amount} {...createForm.register('amount')} />
            </FormField>
            <FormField label="Date" error={createForm.formState.errors.date?.message} required>
              <Input type="date" error={!!createForm.formState.errors.date} {...createForm.register('date')} />
            </FormField>
          </div>
          <FormField label="Description" error={createForm.formState.errors.description?.message} required>
            <Input placeholder="What was this transaction for?" error={!!createForm.formState.errors.description} {...createForm.register('description')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Merchant">
              <Input placeholder="Optional" {...createForm.register('merchant')} />
            </FormField>
            <FormField label="Category">
              <Select {...createForm.register('category_id')}>
                <option value="">No category</option>
                {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea rows={2} placeholder="Optional notes..." {...createForm.register('notes')} />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_recurring_create" {...createForm.register('is_recurring')} className="w-4 h-4 rounded text-indigo-600" />
            <label htmlFor="is_recurring_create" className="text-sm text-gray-700">Recurring transaction</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Add Transaction</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTx} onClose={() => setEditTx(null)} title="Edit Transaction" size="lg">
        <form
          onSubmit={editForm.handleSubmit((v) =>
            updateMutation.mutate({ id: editTx!.id, payload: { ...v, category_id: v.category_id || undefined } })
          )}
          className="space-y-4"
        >
          {updateMutation.error && <ErrorAlert message="Failed to update transaction." />}
          <FormField label="Description" error={editForm.formState.errors.description?.message} required>
            <Input error={!!editForm.formState.errors.description} {...editForm.register('description')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Merchant">
              <Input {...editForm.register('merchant')} />
            </FormField>
            <FormField label="Category">
              <Select {...editForm.register('category_id')}>
                <option value="">No category</option>
                {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea rows={2} {...editForm.register('notes')} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditTx(null)}>Cancel</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={() => deleteTx && deleteMutation.mutate(deleteTx.id)}
        title="Delete Transaction"
        message={`Delete "${deleteTx?.description}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
