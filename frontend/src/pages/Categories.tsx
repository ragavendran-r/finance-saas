import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { categoriesApi } from '../api/categories';
import type { Category } from '../types';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { FormField, Input, Select } from '../components/FormField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const PRESET_ICONS = ['🏠', '🚗', '🍔', '💊', '🎬', '✈️', '💡', '📱', '🎓', '💰', '🛒', '💪', '🎁', '🐾', '📊'];

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Categories() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', icon: '📊' },
  });

  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setCreateOpen(false);
      createForm.reset({ color: '#6366f1', icon: '📊' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormValues }) =>
      categoriesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeleteCategory(null);
    },
  });

  const openEdit = (cat: Category) => {
    setEditCategory(cat);
    editForm.reset({
      name: cat.name,
      icon: cat.icon || '',
      color: cat.color || '#6366f1',
      parent_id: cat.parent_id || '',
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load categories" />;

  const rootCategories = (categories ?? []).filter((c) => !c.parent_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">{categories?.length ?? 0} categories</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Add Category
        </Button>
      </div>

      {(categories ?? []).length === 0 ? (
        <EmptyState
          icon={<Tag className="w-12 h-12" />}
          title="No categories yet"
          description="Create categories to organize your transactions."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Add Category
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Parent</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Subcategories</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(categories ?? []).map((cat) => {
                const subcats = (categories ?? []).filter((c) => c.parent_id === cat.id);
                const parent = (categories ?? []).find((c) => c.id === cat.parent_id);
                return (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{ backgroundColor: cat.color ? `${cat.color}22` : '#f3f4f6' }}
                        >
                          {cat.icon || <Tag className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{cat.name}</span>
                          {cat.color && (
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {parent ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{parent.icon}</span>
                          <span>{parent.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {subcats.length > 0 ? (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {subcats.length} subcategories
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCategory(cat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Category">
        <form
          onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
        >
          {createMutation.error && <ErrorAlert message="Failed to create category." />}
          <FormField label="Name" error={createForm.formState.errors.name?.message} required>
            <Input placeholder="e.g. Food & Dining" error={!!createForm.formState.errors.name} {...createForm.register('name')} />
          </FormField>
          <FormField label="Icon">
            <div className="space-y-2">
              <Input placeholder="Paste emoji or text" {...createForm.register('icon')} />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => createForm.setValue('icon', icon)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 text-base transition-colors border border-gray-200"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </FormField>
          <FormField label="Color">
            <div className="space-y-2">
              <Input type="color" className="h-10 cursor-pointer" {...createForm.register('color')} />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => createForm.setValue('color', color)}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </FormField>
          <FormField label="Parent Category">
            <Select {...createForm.register('parent_id')}>
              <option value="">None (top-level)</option>
              {rootCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Category</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
        <form
          onSubmit={editForm.handleSubmit((v) =>
            updateMutation.mutate({ id: editCategory!.id, payload: v })
          )}
          className="space-y-4"
        >
          {updateMutation.error && <ErrorAlert message="Failed to update category." />}
          <FormField label="Name" error={editForm.formState.errors.name?.message} required>
            <Input error={!!editForm.formState.errors.name} {...editForm.register('name')} />
          </FormField>
          <FormField label="Icon">
            <div className="space-y-2">
              <Input {...editForm.register('icon')} />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => editForm.setValue('icon', icon)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 text-base transition-colors border border-gray-200"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </FormField>
          <FormField label="Color">
            <Input type="color" className="h-10 cursor-pointer" {...editForm.register('color')} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditCategory(null)}>Cancel</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        onConfirm={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}
        title="Delete Category"
        message={`Delete "${deleteCategory?.name}"? Transactions in this category will become uncategorized.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
