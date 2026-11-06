'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { COURSE_LEVELS, COURSE_SORTS, SESSION_LANGUAGES, type CourseLevel, type CourseSort, type SessionLanguage } from '@azza/shared';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CategoryIcon, useCategories } from '@/components/brand/category';
import type { CourseListParams } from '@/lib/api/courses';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

export interface CatalogFilters {
  q: string;
  category: string;
  level?: CourseLevel;
  language?: SessionLanguage;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort: CourseSort;
}

const RATINGS = [3, 4, 4.5];
const ANY = 'any';

const num = (v: string | null) => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const oneOf = <T extends string>(list: readonly T[], v: string | null) => (v && (list as readonly string[]).includes(v) ? (v as T) : undefined);

/** Catalog filters live in the URL (`?category=…&level=…&sort=…`) so results are shareable and survive reloads. */
export function useCatalogFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: CatalogFilters = useMemo(
    () => ({
      q: sp.get('q') ?? '',
      category: sp.get('category') ?? '',
      level: oneOf(COURSE_LEVELS, sp.get('level')),
      language: oneOf(SESSION_LANGUAGES, sp.get('language')),
      minPrice: num(sp.get('minPrice')),
      maxPrice: num(sp.get('maxPrice')),
      minRating: num(sp.get('minRating')),
      sort: oneOf(COURSE_SORTS, sp.get('sort')) ?? 'newest',
    }),
    [sp],
  );

  const set = useCallback(
    (patch: Partial<Record<keyof CatalogFilters, string | number | undefined>>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || (k === 'sort' && v === 'newest')) next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const clear = useCallback(() => set({ q: undefined, category: undefined, level: undefined, language: undefined, minPrice: undefined, maxPrice: undefined, minRating: undefined, sort: undefined }), [set]);

  /** Filters behind the "Filters" button (category chips and search stay visible). */
  const activeCount = [filters.level, filters.language, filters.minPrice ?? filters.maxPrice, filters.minRating].filter((v) => v !== undefined).length;
  const anyActive = activeCount > 0 || !!filters.q || !!filters.category;
  return { filters, set, clear, activeCount, anyActive };
}

export function toListParams(f: CatalogFilters): CourseListParams {
  return {
    q: f.q || undefined,
    category: f.category || undefined,
    level: f.level,
    language: f.language,
    minPriceAed: f.minPrice,
    maxPriceAed: f.maxPrice,
    minRating: f.minRating,
    sort: f.sort,
  };
}

type FilterApi = ReturnType<typeof useCatalogFilters>;

/** Category chips from `GET /categories`, with published-course counts. */
export function CategoryChips({ api }: { api: FilterApi }) {
  const { t, f, pick } = useI18n();
  const categories = useCategories();
  const list = (categories.data ?? []).filter((c) => c.courseCount > 0 || c.slug === api.filters.category);
  if (list.length === 0) return null;
  const chip =
    'h-9 shrink-0 gap-1.5 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';
  return (
    <ToggleGroup
      type="single"
      value={api.filters.category || ANY}
      onValueChange={(v) => api.set({ category: v === ANY || !v ? undefined : v })}
      aria-label={t.admin.editor.category}
      className="-mx-1 flex justify-start gap-2 overflow-x-auto px-1 pb-1"
    >
      <ToggleGroupItem value={ANY} className={chip}>
        {t.catalog.allCategories}
      </ToggleGroupItem>
      {list.map((c) => (
        <ToggleGroupItem key={c.slug} value={c.slug} className={chip}>
          <CategoryIcon name={c.icon} className="size-3.5" />
          {pick(c.nameEn, c.nameAr).text}
          <span className="font-mono text-[11px] opacity-70">{f.number(c.courseCount)}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Level, language, price, rating and sort: inline from `md` up, in a bottom sheet below it. */
export function FilterBar({ api }: { api: FilterApi }) {
  const { t, f, fill } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden flex-wrap items-end gap-3 md:flex">
        <FilterFields api={api} layout="inline" />
        {api.anyActive && (
          <Button variant="ghost" size="sm" onClick={api.clear} className="self-end">
            {t.catalog.clearFilters}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full">
              <SlidersHorizontal /> {api.activeCount ? fill(t.catalog.filtersCount, { n: f.number(api.activeCount) }) : t.catalog.filters}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[24px] p-6">
            <SheetHeader className="p-0">
              <SheetTitle>{t.catalog.filtersTitle}</SheetTitle>
              <SheetDescription className="sr-only">{t.catalog.filtersTitle}</SheetDescription>
            </SheetHeader>
            <FilterFields api={api} layout="stacked" />
            <SheetFooter className="flex-row gap-2 p-0">
              {api.anyActive && (
                <Button variant="ghost" onClick={api.clear}>
                  {t.catalog.clearFilters}
                </Button>
              )}
              <Button className="flex-1" onClick={() => setOpen(false)}>
                {t.catalog.showResults}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <SortSelect api={api} className="ms-auto" />
      </div>
    </>
  );
}

function SortSelect({ api, className }: { api: FilterApi; className?: string }) {
  const { t } = useI18n();
  return (
    <Select value={api.filters.sort} onValueChange={(v) => api.set({ sort: v })}>
      <SelectTrigger size="sm" aria-label={t.catalog.sort} className={cn('rounded-full', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COURSE_SORTS.map((s) => (
          <SelectItem key={s} value={s}>
            {t.catalog.sorts[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterFields({ api, layout }: { api: FilterApi; layout: 'inline' | 'stacked' }) {
  const { t, f, fill } = useI18n();
  const { filters, set } = api;
  const stacked = layout === 'stacked';
  const id = `catalog-${layout}`;
  const trigger = cn(stacked ? 'w-full' : 'min-w-40 rounded-full', 'data-[size=default]:h-10');
  return (
    <div className={cn(stacked ? 'flex flex-col gap-4' : 'contents')}>
      <Field label={t.catalog.level} htmlFor={`${id}-level`}>
        <Select value={filters.level ?? ANY} onValueChange={(v) => set({ level: v === ANY ? undefined : v })}>
          <SelectTrigger id={`${id}-level`} className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t.catalog.anyLevel}</SelectItem>
            {COURSE_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {t.status.level[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t.catalog.language} htmlFor={`${id}-language`}>
        <Select value={filters.language ?? ANY} onValueChange={(v) => set({ language: v === ANY ? undefined : v })}>
          <SelectTrigger id={`${id}-language`} className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t.catalog.anyLanguage}</SelectItem>
            {SESSION_LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>
                {t.status.sessionLanguage[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] text-muted-foreground">{t.catalog.price}</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            dir="ltr"
            aria-label={`${t.catalog.price} · ${t.catalog.priceMin}`}
            placeholder={t.catalog.priceMin}
            value={filters.minPrice ?? ''}
            onChange={(e) => set({ minPrice: e.target.value })}
            className={cn('h-10', stacked ? 'flex-1' : 'w-24 rounded-full')}
          />
          <span aria-hidden className="text-muted-foreground">
            –
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            dir="ltr"
            aria-label={`${t.catalog.price} · ${t.catalog.priceMax}`}
            placeholder={t.catalog.priceMax}
            value={filters.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value })}
            className={cn('h-10', stacked ? 'flex-1' : 'w-24 rounded-full')}
          />
        </div>
      </fieldset>
      <Field label={t.catalog.rating} htmlFor={`${id}-rating`}>
        <Select value={filters.minRating !== undefined ? String(filters.minRating) : ANY} onValueChange={(v) => set({ minRating: v === ANY ? undefined : v })}>
          <SelectTrigger id={`${id}-rating`} className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t.catalog.anyRating}</SelectItem>
            {RATINGS.map((r) => (
              <SelectItem key={r} value={String(r)}>
                {fill(t.catalog.ratingAtLeast, { n: f.number(r) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {!stacked && (
        <Field label={t.catalog.sort} htmlFor={`${id}-sort`} className="ms-auto">
          <Select value={filters.sort} onValueChange={(v) => set({ sort: v })}>
            <SelectTrigger id={`${id}-sort`} className={trigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURSE_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t.catalog.sorts[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
