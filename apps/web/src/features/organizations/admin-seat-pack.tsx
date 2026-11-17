'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageTitle } from '@/components/brand/section';
import { organizationsAdminApi } from '@/lib/api';
import { useApiError } from '@/lib/api-errors';
import { useI18n } from '@/lib/i18n/provider';
import { SeatPackPanel } from './seat-pack-panel';

/** `/admin/organizations/[id]/packs/[packId]`: seats, assignments, payment and cancellation of one pack, with its history. */
export function AdminSeatPack({ organizationId, packId }: { organizationId: string; packId: string }) {
  const { t } = useI18n();
  const c = t.organizations;
  const apiError = useApiError();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });

  const markPaid = useMutation({
    mutationFn: () => organizationsAdminApi.markPaid(packId, reference.trim()),
    onSuccess: () => {
      setPaying(false);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const cancel = useMutation({
    mutationFn: () => organizationsAdminApi.cancelPack(packId),
    onSuccess: () => {
      setCancelling(false);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/admin/organizations/${organizationId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4 rtl:rotate-180" /> {c.title}
      </Link>
      <PageTitle kicker={c.kicker} title={c.packs} />
      <SeatPackPanel
        source={{
          key: ['admin', 'organizations', 'pack', packId],
          load: () => organizationsAdminApi.pack(packId),
          assign: (input) => organizationsAdminApi.assign(packId, input),
          revoke: (id) => organizationsAdminApi.revoke(id),
        }}
        adminActions={(pack) => (
          <>
            {pack.status === 'INVOICED' && (
              <Button variant="ink" size="sm" onClick={() => setPaying(true)}>
                {c.markPaid}
              </Button>
            )}
            {pack.status !== 'CANCELLED' && (
              <Button variant="destructive" size="sm" onClick={() => setCancelling(true)}>
                {c.cancelPack}
              </Button>
            )}
          </>
        )}
      />

      <Dialog open={paying} onOpenChange={setPaying}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.markPaidTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paid-ref">{c.paymentReference}</Label>
            <Input id="paid-ref" dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(false)}>
              {c.cancel}
            </Button>
            <Button variant="ink" disabled={!reference.trim() || markPaid.isPending} onClick={() => markPaid.mutate()}>
              {c.markPaid}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelling} onOpenChange={setCancelling}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.cancelPack}</AlertDialogTitle>
            <AlertDialogDescription>{c.cancelConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={cancel.isPending} onClick={(e) => { e.preventDefault(); cancel.mutate(); }}>
              {c.cancelPack}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
