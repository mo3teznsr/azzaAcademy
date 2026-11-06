'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryInput } from '@azza/shared';
import type { z } from 'zod';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CategoryIcon } from '@/components/brand/category';
import { Chip } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { categoriesApi, type Category } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

type In = z.input<typeof categoryInput>;
type Out = z.output<typeof categoryInput>;

/** Admin: manage the course categories — create, rename, reorder, hide (`active`) and delete unused ones. */
export function AdminCategories() {
  const { t, f, fill, pick } = useI18n();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: qk.categories(true), queryFn: () => categoriesApi.list(true) });
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['categories'] });

  const toggle = useMutation({
    mutationFn: (c: Category) => categoriesApi.update(c.slug, { active: !c.active }),
    onSuccess: () => (toast.success(t.admin.categories.saved), invalidate()),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (c: Category) => categoriesApi.remove(c.slug),
    onSuccess: () => {
      toast.success(t.admin.categories.deleted);
      setDeleting(null);
      invalidate();
    },
    // 409 when courses still use it: the API says so; keep the dialog closed and show its message.
    onError: (e: Error) => {
      setDeleting(null);
      toast.error(e.message);
    },
  });

  return (
    <>
      <PageTitle
        kicker={list.data ? fill(t.admin.categories.count, { c: f.number(list.data.length) }) : undefined}
        title={t.admin.categories.title}
        aside={
          <Button variant="ink" onClick={() => setEditing('new')}>
            {t.admin.categories.newCategory}
          </Button>
        }
      />
      <Panel className="p-2">
        {list.isPending ? (
          <LoadingBlock rows={6} height={52} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.length === 0 ? (
          <EmptyState title={t.admin.categories.empty} action={{ label: t.admin.categories.newCategory, onClick: () => setEditing('new') }} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.categories.colName}</TableHead>
                <TableHead>{t.admin.categories.colIcon}</TableHead>
                <TableHead>{t.admin.categories.colOrder}</TableHead>
                <TableHead>{t.admin.categories.colCourses}</TableHead>
                <TableHead>{t.admin.categories.colVisible}</TableHead>
                <TableHead className="text-end">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((c) => (
                <TableRow key={c.slug} className={cn(!c.active && 'text-muted-foreground')}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                        <CategoryIcon name={c.icon} />
                      </span>
                      <span>
                        <b className="block">{pick(c.nameEn, c.nameAr).text}</b>
                        <span className="text-[13px] text-muted-foreground" dir="ltr">
                          {c.slug}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[13px]" dir="ltr">
                      {c.icon ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>{f.number(c.order)}</TableCell>
                  <TableCell>{f.number(c.courseCount)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Switch
                        checked={c.active}
                        disabled={toggle.isPending}
                        onCheckedChange={() => toggle.mutate(c)}
                        aria-label={`${t.admin.categories.active} · ${pick(c.nameEn, c.nameAr).text}`}
                      />
                      {!c.active && <Chip tone="dashed">{t.reviews.hidden}</Chip>}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(c)}>{t.admin.categories.edit}</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                          {t.admin.categories.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CategoryDialog
        key={editing === 'new' ? 'new' : (editing?.slug ?? 'closed')}
        category={editing}
        nextOrder={list.data?.length ?? 0}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fill(t.admin.categories.deleteTitle, { name: deleting ? pick(deleting.nameEn, deleting.nameAr).text : '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.categories.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting);
              }}
            >
              {t.admin.categories.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CategoryDialog({ category, nextOrder, onClose, onSaved }: { category: Category | 'new' | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const existing = category && category !== 'new' ? category : null;
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(categoryInput),
    defaultValues: existing
      ? { slug: existing.slug, nameEn: existing.nameEn, nameAr: existing.nameAr ?? '', icon: existing.icon ?? '', order: existing.order, active: existing.active }
      : { slug: '', nameEn: '', nameAr: '', icon: '', order: nextOrder, active: true },
  });
  const err = form.formState.errors;
  const icon = useWatch({ control: form.control, name: 'icon' });
  const save = useMutation({
    mutationFn: (v: Out) => {
      const body = { nameEn: v.nameEn, nameAr: v.nameAr || undefined, icon: v.icon || undefined, order: v.order, active: v.active };
      return existing ? categoriesApi.update(existing.slug, body) : categoriesApi.create({ ...body, slug: v.slug });
    },
    onSuccess: () => {
      toast.success(existing ? t.admin.categories.saved : t.admin.categories.created);
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? t.admin.categories.editTitle : t.admin.categories.createTitle}</DialogTitle>
        </DialogHeader>
        <form id="category-form" className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
          <F id="cat-slug" label={t.admin.categories.slug} hint={t.admin.categories.slugHint} error={err.slug?.message} className="sm:col-span-2">
            <Input id="cat-slug" dir="ltr" disabled={!!existing} aria-invalid={!!err.slug} {...form.register('slug')} />
          </F>
          <F id="cat-en" label={t.admin.categories.nameEn} error={err.nameEn?.message}>
            <Input id="cat-en" aria-invalid={!!err.nameEn} {...form.register('nameEn')} />
          </F>
          <F id="cat-ar" label={t.admin.categories.nameAr} error={err.nameAr?.message}>
            <Input id="cat-ar" dir="rtl" lang="ar" {...form.register('nameAr')} />
          </F>
          <F id="cat-icon" label={t.admin.categories.icon} hint={t.admin.categories.iconHint} error={err.icon?.message}>
            <span className="flex items-center gap-2">
              <Input id="cat-icon" dir="ltr" placeholder="book-open" {...form.register('icon')} />
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                <CategoryIcon name={icon} />
              </span>
            </span>
          </F>
          <F id="cat-order" label={t.admin.categories.order} hint={t.admin.categories.orderHint} error={err.order?.message}>
            <Input id="cat-order" type="number" min={0} {...form.register('order', { valueAsNumber: true })} />
          </F>
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
            {t.admin.categories.active}
            <Controller control={form.control} name="active" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
          </label>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="category-form" variant="ink" disabled={save.isPending}>
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}
