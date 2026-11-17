'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Panel, StatTile } from '@/components/brand/section';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import type { SeatAssignment, SeatPack, SeatPackDetail } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';

export const PACK_TONE: Record<SeatPack['status'], ChipTone> = { INVOICED: 'sun', PAID: 'sage', CANCELLED: 'strike' };

/** Where the panel reads and writes: admin endpoints or the organization manager's. */
export interface SeatPackSource {
  key: readonly unknown[];
  load: () => Promise<SeatPackDetail>;
  assign: (input: { email: string; name?: string }) => Promise<SeatAssignment>;
  revoke: (assignmentId: string) => Promise<SeatAssignment>;
}

/** One pack: seat usage, the named learners on it, giving and taking back seats. Shared by admins and org managers. */
export function SeatPackPanel({ source, adminActions }: { source: SeatPackSource; adminActions?: (pack: SeatPackDetail) => React.ReactNode }) {
  const { t, f } = useI18n();
  const c = t.organizations;
  const money = useMoney();
  const apiError = useApiError();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: source.key, queryFn: source.load });
  const [form, setForm] = useState({ email: '', name: '' });
  const [revoking, setRevoking] = useState<SeatAssignment | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: source.key.slice(0, 2) });

  const assign = useMutation({
    mutationFn: () => source.assign({ email: form.email.trim(), ...(form.name.trim() && { name: form.name.trim() }) }),
    onSuccess: () => {
      toast.success(c.assigned);
      setForm({ email: '', name: '' });
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => source.revoke(id),
    onSuccess: () => {
      toast.success(c.revoked);
      setRevoking(null);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isPending) return <LoadingBlock rows={3} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const pack = q.data;
  const active = pack.assignments.filter((a) => a.status === 'ACTIVE');
  const open = pack.status !== 'CANCELLED' && pack.unused > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span dir="ltr" className="font-mono text-sm">{pack.reference}</span>
        <Chip tone={PACK_TONE[pack.status]}>{c.status[pack.status]}</Chip>
        {pack.accessEndsAt && (
          <span className="text-sm text-muted-foreground">
            {c.accessEndsAt}: {f.dateLong(pack.accessEndsAt)}
          </span>
        )}
        <div className="ms-auto flex gap-2">{adminActions?.(pack)}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label={c.seats} value={pack.seats} />
        <StatTile label={c.used} value={pack.used} />
        <StatTile label={c.unused} value={pack.unused} tone={pack.unused ? 'ink' : 'default'} />
        <StatTile label={c.total} value={<span className="tabular-nums">{money.aed(pack.totalFils)}</span>} sub={pack.refundedFils ? `− ${money.aed(pack.refundedFils)}` : undefined} />
      </div>

      {open && (
        <Panel>
          <h2 className="font-semibold">{c.assignTitle}</h2>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.email.trim()) assign.mutate();
            }}
          >
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <Label htmlFor="seat-email">{c.email}</Label>
              <Input id="seat-email" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
            </div>
            <div className="flex min-w-56 flex-1 flex-col gap-1.5">
              <Label htmlFor="seat-name">{c.memberName}</Label>
              <Input id="seat-name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <Button type="submit" variant="ink" disabled={assign.isPending}>
              {c.assign}
            </Button>
          </form>
        </Panel>
      )}

      <Panel>
        {pack.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.noSeats}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{c.learner}</TableHead>
                <TableHead>{c.assignedOn}</TableHead>
                <TableHead>{c.statusLabel}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...active, ...pack.assignments.filter((a) => a.status !== 'ACTIVE')].map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <bdi className="font-medium">{a.user.name}</bdi>
                    <div className="text-xs text-muted-foreground" dir="ltr">{a.user.email}</div>
                  </TableCell>
                  <TableCell>{f.dateLong(a.assignedAt)}</TableCell>
                  <TableCell>
                    <Chip tone={a.status === 'ACTIVE' ? 'sage' : 'strike'}>{c.seatStatus[a.status]}</Chip>
                  </TableCell>
                  <TableCell className="text-end">
                    {a.status === 'ACTIVE' && (
                      <Button size="sm" variant="ghost" onClick={() => setRevoking(a)}>
                        {c.revoke}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {pack.history.length > 0 && (
        <Panel>
          <h2 className="font-semibold">{c.history}</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {pack.history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3">
                <span className="text-muted-foreground">{f.dateLong(h.createdAt)}</span>
                <span dir="ltr" className="font-mono text-xs">{h.action}</span>
                {h.actorName && <bdi>{h.actorName}</bdi>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <AlertDialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {c.revoke} · <bdi>{revoking?.user.name}</bdi>
            </AlertDialogTitle>
            <AlertDialogDescription>{c.revokeConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={revoke.isPending} onClick={(e) => { e.preventDefault(); if (revoking) revoke.mutate(revoking.id); }}>
              {c.revoke}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
