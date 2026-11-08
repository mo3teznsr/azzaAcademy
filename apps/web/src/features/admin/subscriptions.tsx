'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@azza/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { PageTitle, Panel } from '@/components/brand/section';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { adminApi, coursesApi, type AdminSubscription } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { Pager } from './courses';
import { useProposalError } from './proposal-review';

const ALL = '__all';
const PROVIDERS = ['STRIPE', 'APPLE', 'BANK_TRANSFER'] as const;
const TONE: Record<SubscriptionStatus, ChipTone> = { INCOMPLETE: 'dashed', ACTIVE: 'sage', PAST_DUE: 'peach', CANCELLING: 'sun', EXPIRED: 'outline' };

export function AdminSubscriptions() {
  const { t, f, fill, pick } = useI18n();
  const money = useMoney();
  const [courseId, setCourseId] = useState(useSearchParams().get('courseId') ?? ALL);
  const [status, setStatus] = useState(ALL);
  const [provider, setProvider] = useState(ALL);
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminSubscription | null>(null);
  const params = {
    courseId: courseId === ALL ? undefined : courseId,
    status: status === ALL ? undefined : (status as SubscriptionStatus),
    provider: provider === ALL ? undefined : (provider as (typeof PROVIDERS)[number]),
    page,
    pageSize: 20,
  };
  const q = useQuery({ queryKey: qk.admin.subscriptions(params), queryFn: () => adminApi.subscriptions(params) });
  const cp = { type: 'RECORDED' as const, pageSize: 100 };
  const courses = useQuery({ queryKey: qk.courses(cp), queryFn: () => coursesApi.list(cp) });
  const reset = <T,>(set: (v: T) => void) => (v: T) => (set(v), setPage(1));
  const s = t.recordedOps.subs;

  return (
    <>
      <PageTitle kicker={t.nav.admin.finance} title={s.title} />
      <p className="max-w-3xl text-sm text-muted-foreground">{s.intro}</p>
      <div className="flex flex-wrap gap-3">
        <Select value={courseId} onValueChange={reset(setCourseId)}>
          <SelectTrigger aria-label={s.course} className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allCourses}</SelectItem>
            {(courses.data?.items ?? [])
              .filter((c) => c.type === 'RECORDED')
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {pick(c.titleEn, c.titleAr).text}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={reset(setStatus)}>
          <SelectTrigger aria-label={s.status} className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allStatuses}</SelectItem>
            {SUBSCRIPTION_STATUSES.map((x) => (
              <SelectItem key={x} value={x}>
                {s.status_[x]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={provider} onValueChange={reset(setProvider)}>
          <SelectTrigger aria-label={s.provider} className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{s.allProviders}</SelectItem>
            {PROVIDERS.map((x) => (
              <SelectItem key={x} value={x}>
                {s.providers[x]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Panel className="p-2">
        {q.isPending ? (
          <LoadingBlock rows={5} height={52} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyState title={s.empty} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{s.colLearner}</TableHead>
                  <TableHead>{s.colCourse}</TableHead>
                  <TableHead>{s.colProvider}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{s.colEnd}</TableHead>
                  <TableHead>{s.colLast}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <bdi className="block font-medium">{r.user.name}</bdi>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {r.user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block">{pick(r.course.titleEn, r.course.titleAr).text}</span>
                      <span className="text-xs text-muted-foreground">{s.plan[r.plan]}</span>
                    </TableCell>
                    <TableCell className="text-sm">{s.providers[r.provider]}</TableCell>
                    <TableCell>
                      <Chip tone={TONE[r.status]}>{s.status_[r.status]}</Chip>
                      {r.cancelAtPeriodEnd && r.status !== 'EXPIRED' && <span className="mt-1 block text-xs text-muted-foreground">{s.endsAtPeriod}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{r.currentPeriodEnd ? f.dayMonth(r.currentPeriodEnd) : '—'}</TableCell>
                    <TableCell className="text-sm">{r.lastPayment ? `${money.aed(r.lastPayment.totalFils)}${r.lastPayment.paidAt ? ` · ${f.dayMonth(r.lastPayment.paidAt)}` : ''}` : '—'}</TableCell>
                    <TableCell className="text-end">
                      {r.provider === 'APPLE' ? (
                        <span className="text-sm text-muted-foreground">{s.managedByApple}</span>
                      ) : r.status === 'EXPIRED' ? (
                        '—'
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setTarget(r)}>
                          {s.cancel}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={q.data.page} pageCount={q.data.pageCount} onPage={setPage} />
            <span className="sr-only">{fill(t.common.showing, { n: f.number(q.data.items.length), total: f.number(q.data.total) })}</span>
          </>
        )}
      </Panel>
      <CancelDialog key={target?.id ?? 'none'} sub={target} onClose={() => setTarget(null)} />
    </>
  );
}

function CancelDialog({ sub, onClose }: { sub: AdminSubscription | null; onClose: () => void }) {
  const { t, fill, pick } = useI18n();
  const qc = useQueryClient();
  const [refund, setRefund] = useState<'NONE' | 'FULL'>('NONE');
  const errorText = useProposalError();
  const s = t.recordedOps.subs;
  const m = useMutation({
    mutationFn: () => adminApi.cancelSubscription(sub!.id, refund),
    onSuccess: (r) => {
      toast.success(s.cancelled);
      if (r?.closedPayments?.some((p) => p.receiptUploaded)) toast.warning(s.returnByHand, { duration: Infinity, closeButton: true });
      void qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <AlertDialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{s.cancelTitle}</AlertDialogTitle>
          <AlertDialogDescription>{sub ? fill(s.cancelBody, { name: sub.user.name, course: pick(sub.course.titleEn, sub.course.titleAr).text }) : ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label id="refund-label">{s.refundLabel}</Label>
          <RadioGroup aria-labelledby="refund-label" value={refund} onValueChange={(v) => setRefund(v as 'NONE' | 'FULL')}>
            <Label className="flex min-h-11 items-center gap-3">
              <RadioGroupItem value="NONE" /> {s.refundNone}
            </Label>
            <Label className="flex min-h-11 items-center gap-3">
              <RadioGroupItem value="FULL" /> {s.refundFull}
            </Label>
          </RadioGroup>
          {refund === 'FULL' && <p className="text-[13px] text-muted-foreground">{sub?.provider === 'BANK_TRANSFER' ? s.refundTransferNote : s.refundFullNote}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{s.keep}</AlertDialogCancel>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {s.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
