'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { toast } from 'sonner';
import { organizationInput, type OrganizationInput } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { organizationsAdminApi, type Organization } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { useI18n } from '@/lib/i18n/provider';

/** `/admin/organizations`: companies and schools that buy seat packs. */
export function AdminOrganizations() {
  const { t } = useI18n();
  const c = t.organizations;
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const list = useQuery({ queryKey: ['admin', 'organizations', q], queryFn: () => organizationsAdminApi.list(q || undefined) });
  return (
    <>
      <PageTitle
        kicker={c.kicker}
        title={c.title}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Input aria-label={c.search} placeholder={c.search} className="h-11 w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="ink" onClick={() => setAdding(true)}>
              {c.add}
            </Button>
          </div>
        }
      />
      {list.isPending ? (
        <LoadingBlock rows={4} height={48} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title={c.empty} body={c.emptyBody} action={{ label: c.add, onClick: () => setAdding(true) }} />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.name}</TableHead>
                <TableHead>{c.contactName}</TableHead>
                <TableHead className="text-end">{c.members}</TableHead>
                <TableHead className="text-end">{c.packs}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/organizations/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      <bdi>{o.name}</bdi>
                    </Link>
                    <div className="text-xs text-muted-foreground"><bdi>{o.legalName}</bdi></div>
                  </TableCell>
                  <TableCell>
                    <bdi>{o.contactName}</bdi>
                    <div className="text-xs text-muted-foreground" dir="ltr">{o.contactEmail}</div>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{o.members}</TableCell>
                  <TableCell className="text-end tabular-nums">{o.packs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
      <OrganizationDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

type FormValues = z.input<typeof organizationInput>;

const FIELDS: Array<{ name: keyof FormValues; dir?: 'ltr'; type?: string }> = [
  { name: 'name' },
  { name: 'legalName' },
  { name: 'trn', dir: 'ltr' },
  { name: 'address' },
  { name: 'contactName' },
  { name: 'contactEmail', dir: 'ltr', type: 'email' },
  { name: 'contactPhone', dir: 'ltr', type: 'tel' },
  { name: 'billingEmail', dir: 'ltr', type: 'email' },
];

/** Create (no `current`) or edit an organization. */
export function OrganizationDialog({ open, onClose, current }: { open: boolean; onClose: () => void; current?: Organization }) {
  const { t } = useI18n();
  const c = t.organizations;
  const apiError = useApiError();
  const qc = useQueryClient();
  const form = useForm<FormValues, unknown, OrganizationInput>({
    resolver: zodResolver(organizationInput),
    values: current
      ? { ...current, trn: current.trn ?? '', address: current.address ?? '', contactPhone: current.contactPhone ?? '' }
      : { name: '', legalName: '', trn: '', address: '', contactName: '', contactEmail: '', contactPhone: '', billingEmail: '' },
  });
  const m = useMutation({
    mutationFn: (v: OrganizationInput) => (current ? organizationsAdminApi.update(current.id, v) : organizationsAdminApi.create(v)),
    onSuccess: () => {
      toast.success(c.saved);
      void qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const err = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{current ? c.edit : c.add}</DialogTitle>
        </DialogHeader>
        <form id="org-form" className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => m.mutate(v))}>
          {FIELDS.map((fd) => (
            <div key={fd.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`org-${fd.name}`}>{c[fd.name]}</Label>
              <Input id={`org-${fd.name}`} dir={fd.dir} type={fd.type ?? 'text'} aria-invalid={!!err[fd.name]} {...form.register(fd.name)} />
              {err[fd.name] && <p className="text-xs text-danger-fg">{String(err[fd.name]?.message ?? '')}</p>}
            </div>
          ))}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="org-form" variant="ink" disabled={m.isPending}>
            {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
