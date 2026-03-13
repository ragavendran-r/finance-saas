import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, CreditCard, Building2, PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import { accountsApi } from '../api/accounts';
import type { Account, AccountType } from '../types';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { FormField, Input, Select } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { formatCurrency } from '../utils/format';

const ACCOUNT_TYPES: AccountType[] = ['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH'];

const CURRENCIES = [
  { code: 'INR', label: 'INR – Indian Rupee' },
  { code: 'USD', label: 'USD – US Dollar' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'GBP', label: 'GBP – British Pound' },
  { code: 'JPY', label: 'JPY – Japanese Yen' },
  { code: 'AUD', label: 'AUD – Australian Dollar' },
  { code: 'CAD', label: 'CAD – Canadian Dollar' },
  { code: 'SGD', label: 'SGD – Singapore Dollar' },
  { code: 'AED', label: 'AED – UAE Dirham' },
  { code: 'CHF', label: 'CHF – Swiss Franc' },
];

const accountTypeIcon = {
  CHECKING: CreditCard,
  SAVINGS: PiggyBank,
  CREDIT: CreditCard,
  INVESTMENT: TrendingUp,
  CASH: Wallet,
};

const accountTypeBadge: Record<AccountType, 'blue' | 'green' | 'red' | 'purple' | 'yellow'> = {
  CHECKING: 'blue',
  SAVINGS: 'green',
  CREDIT: 'red',
  INVESTMENT: 'purple',
  CASH: 'yellow',
};

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH']),
  currency: z.string().min(3, 'Currency required').max(3),
  balance: z.coerce.number(),
  institution_name: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name required'),
  institution_name: z.string().optional(),
  is_active: z.boolean().optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export default function Accounts() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  });

  const createForm = useForm<CreateValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSchema) as any,
    defaultValues: { currency: 'INR', type: 'SAVINGS', balance: 0 },
  });

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setCreateOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EditValues }) =>
      accountsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setEditAccount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteAccount(null);
    },
  });

  const openEdit = (account: Account) => {
    setEditAccount(account);
    editForm.reset({
      name: account.name,
      institution_name: account.institution_name || '',
      is_active: account.is_active,
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load accounts" />;

  const totalBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {accounts?.length ?? 0} accounts • Total:{' '}
            <span className="font-semibold text-gray-800">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Add Account
        </Button>
      </div>

      {(accounts ?? []).length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-12 h-12" />}
          title="No accounts yet"
          description="Add your bank accounts, credit cards, and investments to get started."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Add Account
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(accounts ?? []).map((account) => {
            const typeKey = account.type.toUpperCase() as AccountType;
            const Icon = accountTypeIcon[typeKey];
            return (
              <div
                key={account.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{account.name}</p>
                      {account.institution_name && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {account.institution_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(account)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteAccount(account)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                    <p
                      className={`text-xl font-bold ${
                        account.balance < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={accountTypeBadge[typeKey]}>{typeKey}</Badge>
                    {!account.is_active && <Badge variant="gray">Inactive</Badge>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Account">
        <form
          onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v as CreateValues))}
          className="space-y-4"
        >
          {createMutation.error && (
            <ErrorAlert message="Failed to create account. Please try again." />
          )}
          <FormField label="Account Name" error={createForm.formState.errors.name?.message} required>
            <Input
              placeholder="Main Checking"
              error={!!createForm.formState.errors.name}
              {...createForm.register('name')}
            />
          </FormField>
          <FormField label="Type" error={createForm.formState.errors.type?.message} required>
            <Select error={!!createForm.formState.errors.type} {...createForm.register('type')}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency" error={createForm.formState.errors.currency?.message} required>
              <Select error={!!createForm.formState.errors.currency} {...createForm.register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Initial Balance" error={createForm.formState.errors.balance?.message} required>
              <Input type="number" step="0.01" error={!!createForm.formState.errors.balance} {...createForm.register('balance')} />
            </FormField>
          </div>
          <FormField label="Institution" error={createForm.formState.errors.institution_name?.message}>
            <Input placeholder="Chase, Vanguard..." {...createForm.register('institution_name')} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Account</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
        <form
          onSubmit={editForm.handleSubmit((v) =>
            updateMutation.mutate({ id: editAccount!.id, payload: v })
          )}
          className="space-y-4"
        >
          {updateMutation.error && (
            <ErrorAlert message="Failed to update account." />
          )}
          <FormField label="Account Name" error={editForm.formState.errors.name?.message} required>
            <Input error={!!editForm.formState.errors.name} {...editForm.register('name')} />
          </FormField>
          <FormField label="Institution">
            <Input placeholder="Optional" {...editForm.register('institution_name')} />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...editForm.register('is_active')} className="w-4 h-4 rounded text-indigo-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditAccount(null)}>Cancel</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteAccount}
        onClose={() => setDeleteAccount(null)}
        onConfirm={() => deleteAccount && deleteMutation.mutate(deleteAccount.id)}
        title="Delete Account"
        message={`Are you sure you want to delete "${deleteAccount?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
