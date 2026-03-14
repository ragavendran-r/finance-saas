import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import type { Category } from '../types';

/** Shared hook — categories are semi-static so we cache them for 10 minutes. */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
