'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { OrderStatusChip } from '@/components/brand/status-chip';
import { SignalMark } from '@/components/brand/signal-mark';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { batchesApi, checkoutApi, type Order } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useSocketEvent } from '@/lib/realtime/socket';
import { cn } from '@/lib/utils';

/** Poll every 2 s while the webhook hasn't landed, for about a minute. */
const POLL_MS = 2_000;
const MAX_POLLS = 30;

type View = 'confirming' | 'slow' | 'paid' | 'cancelled' | 'failed';

function viewOf(o: Order, cancelled: boolean, polls: number): View {
  if (o.status === 'PAID') return 'paid';
  if (o.status === 'FAILED' || o.status === 'EXPIRED' || o.status === 'REJECTED' || o.status === 'REFUNDED') return 'failed';
  if (cancelled) return 'cancelled';
  return polls >= MAX_POLLS ? 'slow' : 'confirming';
}

/** Stripe Checkout landing (`/checkout/return?ref=…[&cancelled=1]`): confirming → paid / cancelled / failed. */
export function CheckoutReturn({ reference, cancelled }: { reference: string | null; cancelled: boolean }) {
  const { t } = useI18n();
  if (!reference) return <ErrorState error={new Error(t.checkoutReturn.missingRef)} />;
  return <ReturnView reference={reference} cancelled={cancelled} />;
}

function ReturnView({ reference, cancelled }: { reference: string; cancelled: boolean }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const key = ['order', 'by-reference', reference] as const;
  const q = useQuery({
    queryKey: key,
    queryFn: () => checkoutApi.orderByReference(reference),
    refetchInterval: (query) => {
      const o = query.state.data;
      if (!o || cancelled || o.status !== 'AWAITING_PAYMENT') return false;
      return query.state.dataUpdateCount < MAX_POLLS ? POLL_MS : false;
    },
  });
  useSocketEvent<{ orderId?: string; id?: string }>(SOCKET_EVENTS.ORDER_UPDATED, (p) => {
    if (q.data && (p.orderId === q.data.id || p.id === q.data.id)) void qc.invalidateQueries({ queryKey: key });
  });
  const batchId = q.data?.enrollment?.batch.id;
  const polls = qc.getQueryState(key)?.dataUpdateCount ?? 0;
  const view = q.data ? viewOf(q.data, cancelled, polls) : null;
  // Only the failed state needs the course slug ("Choose another batch").
  const batch = useQuery({ queryKey: qk.batch(batchId ?? ''), queryFn: () => batchesApi.get(batchId!), enabled: !!batchId && view === 'failed' });

  if (q.isPending) return <LoadingBlock rows={2} height={160} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const o = q.data;
  const v = view!;
  const tone = v === 'paid' ? 'good' : v === 'failed' ? 'bad' : 'wait';
  const retryHref = batchId ? `/checkout/${batchId}` : '/learn';
  const otherHref = batch.data ? `/courses/${batch.data.course.slug}` : '/courses';
  const copy: Record<View, { title: string; body: string }> = {
    confirming: { title: t.checkoutReturn.confirmingTitle, body: t.checkoutReturn.confirmingBody },
    slow: { title: t.checkoutReturn.slowTitle, body: t.checkoutReturn.slowBody },
    paid: { title: t.checkout.orderPaid, body: t.checkout.orderPaidSub },
    cancelled: {
      title: t.checkoutReturn.cancelledTitle,
      body: o.expiresAt ? fill(t.checkoutReturn.cancelledHeld, { d: f.dateTime(o.expiresAt) }) : t.checkoutReturn.cancelledBody,
    },
    failed: { title: t.checkoutReturn.failedTitle, body: t.checkoutReturn.failedBody },
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <span className="label-mono text-muted-foreground" dir="ltr">
        {fill(t.checkoutReturn.kicker, { ref: o.reference })}
      </span>
      <section
        role={v === 'failed' ? 'alert' : 'status'}
        aria-live="polite"
        aria-busy={v === 'confirming'}
        className={cn(
          'rounded-[28px] p-8',
          tone === 'good' && 'bg-sage text-ink',
          tone === 'bad' && 'border border-danger-line bg-danger-bg',
          tone === 'wait' && 'border border-border bg-card',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <SignalMark state={tone === 'good' ? 'live' : tone === 'bad' ? 'ended' : 'starting'} size={36} />
          <OrderStatusChip status={o.status} />
        </div>
        <h1 className="mt-6 font-display text-[clamp(36px,5vw,56px)] font-extrabold leading-[0.95]">{copy[v].title}</h1>
        <p className="mt-3 text-lg opacity-80">{copy[v].body}</p>
        {v !== 'failed' && (
          <p className="mt-4 text-sm opacity-70">
            {o.enrollment?.batch.code && (
              <>
                <bdi dir="ltr">{o.enrollment.batch.code}</bdi> ·{' '}
              </>
            )}
            {money.aed(o.totalFils)}
          </p>
        )}
      </section>
      <div className="flex flex-wrap gap-3">
        {v === 'paid' && (
          <Button asChild size="lg">
            <Link href="/learn">{t.checkout.goToLearning}</Link>
          </Button>
        )}
        {v === 'cancelled' && (
          <Button asChild size="lg">
            <Link href={retryHref}>{t.checkout.tryAgain}</Link>
          </Button>
        )}
        {v === 'slow' && (
          <>
            <Button size="lg" disabled={q.isFetching} onClick={() => void q.refetch()}>
              {t.checkoutReturn.checkAgain}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/learn">{t.checkout.goToLearning}</Link>
            </Button>
          </>
        )}
        {v === 'failed' && (
          <Button asChild size="lg">
            <Link href={otherHref}>{t.checkoutReturn.chooseBatch}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
