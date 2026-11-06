import type { CategoryInput, UpdateCategoryInput } from '@azza/shared';
import { http, items } from './client';
import type { Category, Items } from './types';

export const categoriesApi = {
  /** Active categories with published-course counts; `all` (admins) includes hidden ones. */
  list: (all = false) => items(http.get<Items<Category>>('/api/v1/categories', { all: all || undefined })),
  create: (input: CategoryInput) => http.post<Category>('/api/v1/categories', input),
  update: (slug: string, input: UpdateCategoryInput) => http.patch<Category>(`/api/v1/categories/${encodeURIComponent(slug)}`, input),
  /** 409 while courses still use it — hide it with `active: false` instead. */
  remove: (slug: string) => http.del<unknown>(`/api/v1/categories/${encodeURIComponent(slug)}`),
};
