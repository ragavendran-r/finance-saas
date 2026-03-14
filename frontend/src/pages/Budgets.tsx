import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { budgetsApi } from '../api/budgets';
import { categoriesApi } from '../api/categories';
import { accountsApi } from '../api/accounts';
import type { Budget } from '../types';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { FormField, Input, Select } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { formatCurrency, formatDate } from '../utils/format';

const schema = z.object({
  category_id: z.string().min(1, 'Category required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().optional(),
});

const editSchema = z.object({
  category_id: z.string().min(1, 'Category required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().optional(),
});

type CreateValues = z.infer<typeof schema>;
type EditValues = z.infer<typeof editSchema>;

export default function Budgets() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);

  const { data: budgets, isLoading, error } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.list,
  });

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list });
  const currency = accounts?.[0]?.currency || 'USD';

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createForm = useForm<CreateValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { period: 'MONTHLY', start_date: new Date().toISOString().split('T')[0] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) as any });

  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setCreateOpen(false);
      createForm.reset({ period: 'MONTHLY' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EditValues }) =>
      budgetsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setEditBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteBudget(null);
    },
  });

  const openEdit = (budget: Budget) => {
    setEditBudget(budget);
    editForm.reset({
      category_id: budget.category_id,
      amount: budget.amount,
      period: budget.period.toUpperCase() as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
      start_date: budget.start_date?.split('T')[0] || '',
      end_date: budget.end_date?.split('T')[0] || '',
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load budgets" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-1">{budgets?.length ?? 0} budgets</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Add Budget
        </Button>
      </div>

      {(budgets ?? []).length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No budgets yet"
          description="Create budgets to track and control your spending."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Add Budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(budgets ?? []).map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              categories={categories}
              currency={currency}
              onEdit={() => openEdit(budget)}
              onDelete={() => setDeleteBudget(budget)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Budget">
        <form
          onSubmit={createForm.handleSubmit((v) => createMutation.mutate({ ...v, end_date: v.end_date || undefined } as CreateValues))}
          className="space-y-4"
        >
          {createMutation.error && <ErrorAlert message="Failed to create budget." />}
          <FormField label="Category" error={createForm.formState.errors.category_id?.message} required>
            <Select error={!!createForm.formState.errors.category_id} {...createForm.register('category_id')}>
              <option value="">Select category</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" error={createForm.formState.errors.amount?.message} required>
              <Input type="number" step="0.01" min="0" placeholder="500.00" error={!!createForm.formState.errors.amount} {...createForm.register('amount')} />
            </FormField>
            <FormField label="Period" error={createForm.formState.errors.period?.message} required>
              <Select error={!!createForm.formState.errors.period} {...createForm.register('period')}>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date" error={createForm.formState.errors.start_date?.message} required>
              <Input type="date" error={!!createForm.formState.errors.start_date} {...createForm.register('start_date')} />
            </FormField>
            <FormField label="End Date (optional)">
              <Input type="date" {...createForm.register('end_date')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Budget</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editBudget} onClose={() => setEditBudget(null)} title="Edit Budget">
        <form
          onSubmit={editForm.handleSubmit((v) =>
            updateMutation.mutate({ id: editBudget!.id, payload: { ...v, end_date: v.end_date || undefined } as EditValues })
          )}
          className="space-y-4"
        >
          {updateMutation.error && <ErrorAlert message="Failed to update budget." />}
          <FormField label="Category" error={editForm.formState.errors.category_id?.message} required>
            <Select error={!!editForm.formState.errors.category_id} {...editForm.register('category_id')}>
              <option value="">Select category</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" error={editForm.formState.errors.amount?.message} required>
              <Input type="number" step="0.01" min="0" error={!!editForm.formState.errors.amount} {...editForm.register('amount')} />
            </FormField>
            <FormField label="Period" error={editForm.formState.errors.period?.message} required>
              <Select error={!!editForm.formState.errors.period} {...editForm.register('period')}>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date" error={editForm.formState.errors.start_date?.message} required>
              <Input type="date" error={!!editForm.formState.errors.start_date} {...editForm.register('start_date')} />
            </FormField>
            <FormField label="End Date (optional)">
              <Input type="date" {...editForm.register('end_date')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditBudget(null)}>Cancel</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteBudget}
        onClose={() => setDeleteBudget(null)}
        onConfirm={() => deleteBudget && deleteMutation.mutate(deleteBudget.id)}
        title="Delete Budget"
        message={`Delete this budget for "${categories?.find(c => c.id === deleteBudget?.category_id)?.name || 'this category'}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function BudgetCard({
  budget,
  categories,
  currency,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  categories: import('../types').Category[] | undefined;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['budget-progress', budget.id],
    queryFn: () => budgetsApi.progress(budget.id),
  });

  const pct = progress ? Math.min(progress.percent_used, 100) : 0;
  const isOver = progress ? progress.percent_used > 100 : false;
  const isWarning = progress ? progress.percent_used > 80 : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{
              backgroundColor: categories?.find(c => c.id === budget.category_id)?.color
                ? `${categories?.find(c => c.id === budget.category_id)?.color}22`
                : '#f3f4f6',
            }}
          >
            {categories?.find(c => c.id === budget.category_id)?.icon || <Target className="w-4 h-4 text-gray-400" />}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {categories?.find(c => c.id === budget.category_id)?.name || 'Unknown Category'}
            </p>
            <p className="text-xs text-gray-400">
              From {formatDate(budget.start_date)}
              {budget.end_date && ` to ${formatDate(budget.end_date)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={budget.period === 'MONTHLY' ? 'blue' : budget.period === 'WEEKLY' ? 'purple' : 'yellow'}>
            {budget.period}
          </Badge>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-8 animate-pulse bg-gray-100 rounded" />
      ) : progress ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-800'}`}
              >
                {formatCurrency(progress.spent, currency)} spent
              </span>
              {isOver && (
                <Badge variant="red">Over budget!</Badge>
              )}
            </div>
            <span className="text-xs text-gray-500">
              of {formatCurrency(progress.budgeted, currency)}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-xs font-medium ${
                isOver ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {progress.percent_used.toFixed(0)}% used
            </span>
            <span className="text-xs text-gray-500">
              {isOver
                ? `${formatCurrency(Math.abs(progress.remaining), currency)} over`
                : `${formatCurrency(progress.remaining, currency)} remaining`}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
