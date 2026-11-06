'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { OrderStatusChip } from '@/components/brand/status-chip';
import { SignalMark } from '@/components/brand/signal-mark';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { checkoutApi, type Order } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useSocketEvent } from '@/lib/realtime/socket';
import { BankTransferDetails } from './bank-details';

const FINAL = new Set(['PAID', 'FAILED', 'REJECTED', 'EXPIRED', 'REFUNDED']);

export function OrderPage({ id }: { id: string }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: qk.order(id),
    queryFn: () => checkoutApi.order(id),
    refetchInterval: (query) => (query.state.data && FINAL.has(query.state.data.status) ? false : 10_000),
  });
  useSocketEvent<{ orderId?: string; id?: string }>(SOCKET_EVENTS.ORDER_UPDATED, (p) => {
    if (p.orderId === id || p.id === id) void qc.invalidateQueries({ queryKey: qk.order(id) });
  });

  if (q.isPending) return <LoadingBlock rows={2} height={160} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const o = q.data;
  const { title, sub, tone } = copyFor(o, t);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <span className="label-mono text-muted-foreground" dir="ltr">
        {fill(t.checkout.orderTitle, { ref: o.reference })}
      </span>
      <div className={tone === 'good' ? 'rounded-[28px] bg-sage p-8 text-ink' : tone === 'bad' ? 'rounded-[28px] border border-danger-line bg-danger-bg p-8' : 'rounded-[28px] border border-border bg-card p-8'}>
        <div className="flex items-center justify-between gap-3">
          <SignalMark state={tone === 'good' ? 'live' : tone === 'bad' ? 'ended' : 'starting'} size={36} />
          <OrderStatusChip status={o.status} />
        </div>
        <h1 className="mt-6 font-display text-[clamp(40px,6vw,64px)] font-extrabold leading-[0.9]">{title}</h1>
        {sub && <p className="mt-3 text-lg opacity-80">{sub}</p>}
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="label-mono opacity-70">{t.checkout.total}</dt>
            <dd className="font-semibold">{money.aed(o.totalFils)}</dd>
          </div>
          <div>
            <dt className="label-mono opacity-70">{t.admin.payments.colMethod}</dt>
            <dd className="font-semibold">{t.status.method[o.method]}</dd>
          </div>
          <div>
            <dt className="label-mono opacity-70">{t.common.status}</dt>
            <dd className="font-semibold">{f.dateTime(o.paidAt ?? o.createdAt)}</dd>
          </div>
        </dl>
      </div>
      {(o.status === 'AWAITING_RECEIPT' || o.status === 'AMOUNT_MISMATCH' || o.status === 'AWAITING_PAYMENT') && o.method === 'BANK_TRANSFER' && (
        <BankTransferDetails order={o} bankAccount={o.bankAccount} reference={o.reference} expiresAt={o.expiresAt} onUploaded={() => void q.refetch()} />
      )}
      {o.rejectionReason && <p className="text-sm text-danger-fg">{o.rejectionReason}</p>}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/learn">{t.checkout.goToLearning}</Link>
        </Button>
        {(o.status === 'FAILED' || o.status === 'REJECTED' || o.status === 'EXPIRED') && o.enrollment?.batch && (
          <Button asChild variant="outline">
            <Link href={`/checkout/${o.enrollment.batch.id}`}>{t.checkout.tryAgain}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function copyFor(o: Order, t: ReturnType<typeof useI18n>['t']): { title: string; sub?: string; tone: 'good' | 'bad' | 'wait' } {
  switch (o.status) {
    case 'PAID':
      return { title: t.checkout.orderPaid, sub: t.checkout.orderPaidSub, tone: 'good' };
    case 'VERIFYING':
      return { title: t.checkout.orderVerifying, sub: t.checkout.orderVerifyingSub, tone: 'wait' };
    case 'AWAITING_RECEIPT':
    case 'AWAITING_PAYMENT':
    case 'AMOUNT_MISMATCH':
      return { title: t.checkout.orderWaiting, sub: t.checkout.nextBank, tone: 'wait' };
    case 'EXPIRED':
      return { title: t.checkout.orderExpired, tone: 'bad' };
    case 'REFUNDED':
      return { title: t.status.order.REFUNDED, sub: t.checkout.refundsBody, tone: 'wait' };
    default:
      return { title: t.checkout.orderFailed, sub: t.checkout.orderFailedSub, tone: 'bad' };
  }
}
