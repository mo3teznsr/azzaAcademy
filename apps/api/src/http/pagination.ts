export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const paged = <T>({ items, total }: { items: T[]; total: number }, page: number, pageSize: number): Paged<T> => ({
  items,
  total,
  page,
  pageSize,
  pageCount: Math.max(1, Math.ceil(total / pageSize)),
});
