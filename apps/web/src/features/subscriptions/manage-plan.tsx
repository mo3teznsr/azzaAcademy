'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleCheck } from 'lucide-react';
import type { SubscriptionPlan } from '@azza/shared';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/brand/states';
import { checkoutApi, isAppleProvider, isCardResult, subscriptionsApi, type MySubscription } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { BankTransferDetails, CopyValue } from '../checkout/bank-details';

/** The self-service actions on one subscription, shared by the plan card, the banner and the learning dashboard. */
export function usePlanActions(subscription: MySubscription) {
  const { t, f } = useI18n();
  const qc = useQueryClient();
  const router = useRouter();
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.mySubscriptions });
  const refreshAll = () => {
    refresh();
    void qc.invalidateQueries({ queryKey: qk.learningProgress });
    void qc.invalidateQueries({ queryKey: qk.lessons(subscription.course.id) });
  };
  // One toast slot per plan: each action replaces the previous message instead of stacking beside it.
  const toastId = `plan-${subscription.id}`;
  const onError = (e: Error) => toast.error(e.message, { id: toastId });
  const end = subscription.currentPeriodEnd ? f.dayMonth(subscription.currentPeriodEnd) : null;

  const cancel = useMutation({
    mutationFn: () => subscriptionsApi.cancel(subscription.id),
    onSuccess: () => (toast.success(t.recorded.cancelled, { id: toastId }), refreshAll()),
    onError,
  });
  const resume = useMutation({
    mutationFn: () => subscriptionsApi.resume(subscription.id),
    onSuccess: () => (toast.success(t.recorded.resumed, { id: toastId }), refreshAll()),
    onError,
  });
  const switchPlan = useMutation({
    mutationFn: (plan: SubscriptionPlan) => subscriptionsApi.switchPlan(subscription.id, plan),
    onSuccess: () => (toast.success(`${t.recorded.switched} ${t.recorded.switchNote}`, { id: toastId }), refreshAll()),
    onError,
  });
  const portal = useMutation({
    mutationFn: () => subscriptionsApi.portal(subscription.id),
    onSuccess: (r) => window.location.assign(r.url),
    onError,
  });
  const switchToCard = useMutation({
    mutationFn: () => subscriptionsApi.switchToCard(subscription.id),
    onSuccess: (r) => window.location.assign(r.checkoutUrl),
    onError,
  });
  /** "Renew to continue" / "Renew by transfer": subscribe again with the previous plan. A live transfer row is allowed and is the renewal. */
  const renew = useMutation({
    mutationFn: (method: 'STRIPE' | 'BANK_TRANSFER') =>
      subscriptionsApi.subscribe(subscription.course.id, { plan: subscription.plan, method }),
    onSuccess: (r) => {
      if (isCardResult(r)) {
        window.location.assign(r.checkoutUrl);
        return;
      }
      refresh();
      // The transfer details live on the plans page.
      router.push('/plans');
    },
    onError,
  });
  return { cancel, resume, switchPlan, portal, switchToCard, renew, end };
}

/** The method a lapsed or renewing learner used last: transfers renew by transfer, everything else by card. */
export const renewMethod = (s: MySubscription): 'STRIPE' | 'BANK_TRANSFER' => (s.provider === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'STRIPE');

/** "Renew to continue": re-subscribes with the previous plan. Without a known plan it sends the learner to the course's plans. */
export function RenewButton({ subscription, slug, className }: { subscription: MySubscription | null | undefined; slug: string; className?: string }) {
  const { t } = useI18n();
  if (!subscription) {
    return (
      <Button asChild variant="ink" className={className}>
        <Link href={`/courses/${slug}#plan`}>{t.recorded.renewToContinue}</Link>
      </Button>
    );
  }
  return <RenewAction subscription={subscription} className={className} />;
}

function RenewAction({ subscription, className }: { subscription: MySubscription; className?: string }) {
  const { t } = useI18n();
  const { renew } = usePlanActions(subscription);
  return (
    <Button variant="ink" className={className} disabled={renew.isPending} onClick={() => renew.mutate(renewMethod(subscription))}>
      {renew.isPending ? t.recorded.renewing : t.recorded.renewToContinue}
    </Button>
  );
}

/** A transfer that's waiting: its reference and amount to copy, the receipt upload, and where the review stands. */
export function PendingTransfer({ subscription, onRestart }: { subscription: MySubscription; onRestart?: () => void }) {
  const { t, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const pending = subscription.pendingPayment;
  const needsReceipt = pending?.status === 'AWAITING_RECEIPT';
  const banks = useQuery({ queryKey: ['bank-accounts'], queryFn: checkoutApi.bankAccounts, enabled: needsReceipt && !pending?.bankAccount, retry: false, staleTime: 5 * 60_000 });
  if (!pending) return null;

  if (pending.status === 'REJECTED') {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl bg-peach p-4 text-ink">
        <b>{t.recorded.pendingRejected}</b>
        {pending.reviewNote && <p className="text-sm">{fill(t.recorded.pendingNote, { note: pending.reviewNote })}</p>}
        {onRestart ? (
          <Button variant="ink" className="self-start" onClick={onRestart}>
            {t.recorded.pendingAgain}
          </Button>
        ) : (
          <Button asChild variant="ink" className="self-start">
            <Link href={`/courses/${subscription.course.slug}#plan`}>{t.recorded.pendingAgain}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (pending.status === 'AWAITING_REVIEW') {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="flex items-start gap-2 text-sm font-semibold">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-deep" aria-hidden /> {t.recorded.pendingReview}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyValue label={t.recorded.pendingAmount} value={money.aed(pending.amountFils)} />
          <CopyValue label={t.recorded.pendingReference} value={pending.reference} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t.recorded.transferNote}</p>
      <BankTransferDetails
        order={{ id: pending.id, totalFils: pending.amountFils }}
        bankAccount={pending.bankAccount ?? banks.data?.[0] ?? null}
        reference={pending.reference}
        expiresAt={pending.expiresAt}
        heldLabel={t.recorded.transferHeld}
        uploadFile={(file) => subscriptionsApi.uploadReceiptFile(pending.id, file)}
        onUploaded={() => void qc.invalidateQueries({ queryKey: qk.mySubscriptions })}
      />
    </div>
  );
}

/** One plan on the "Your plans" page. */
export function ManagePlan({ subscription: s }: { subscription: MySubscription }) {
  const { t, fill, pick } = useI18n();
  const money = useMoney();
  const a = usePlanActions(s);
  const [confirming, setConfirming] = useState(false);
  const title = pick(s.course.titleEn, s.course.titleAr).text;
  const apple = isAppleProvider(s.provider);
  const card = s.provider === 'STRIPE';
  const transfer = s.provider === 'BANK_TRANSFER';
  const lapsed = s.status === 'EXPIRED' || (!s.hasAccess && s.status !== 'INCOMPLETE');
  const waiting = s.status === 'INCOMPLETE';
  const pending = s.pendingPayment;
  const nextPlan: SubscriptionPlan = s.plan === 'YEARLY' ? 'MONTHLY' : 'YEARLY';

  const line = lapsed
    ? t.recorded.ended
    : waiting
      ? pending?.status === 'AWAITING_REVIEW'
        ? t.recorded.pendingReview
        : pending?.status === 'REJECTED'
          ? t.recorded.pendingRejected
          : t.recorded.pendingReceipt
      : s.status === 'PAST_DUE'
        ? t.recorded.pastDue
        : !a.end
          ? null
          : transfer
            ? fill(t.recorded.paidUntil, { date: a.end })
            : fill(s.status === 'CANCELLING' ? t.recorded.ends : t.recorded.renews, { date: a.end });
  const anyError = a.cancel.error ?? a.resume.error ?? a.switchPlan.error ?? a.portal.error ?? a.switchToCard.error ?? a.renew.error;

  return (
    <Card className="gap-0 rounded-2xl py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Link href={`/learn/courses/${s.course.id}`} className="font-display text-xl font-extrabold leading-tight text-foreground hover:underline">
              {title}
            </Link>
            <span className="text-[13px] text-muted-foreground">
              {s.plan === 'YEARLY' ? t.recorded.planYearly : t.recorded.planMonthly} · {money.display(s.priceFils)}
            </span>
          </div>
          <Badge className="bg-green text-ink-deep">{s.plan === 'YEARLY' ? t.recorded.yearly : t.recorded.monthly}</Badge>
        </div>

        {line && (
          <p role="status" className={s.status === 'PAST_DUE' ? 'rounded-xl bg-peach px-4 py-3 text-sm font-semibold text-ink' : 'text-base font-semibold'}>
            {line}
          </p>
        )}

        {pending && <PendingTransfer subscription={s} />}

        {!lapsed && !waiting && card && s.status !== 'CANCELLING' && <p className="text-[13px] text-muted-foreground">{t.recorded.switchNote}</p>}

        {anyError && <ErrorState compact error={anyError} />}

        <div className="flex flex-wrap gap-2">
          {lapsed && <RenewButton subscription={s} slug={s.course.slug} />}
          {!lapsed && !waiting && card && (
            <>
              {s.status === 'CANCELLING' ? (
                <Button variant="ink" disabled={a.resume.isPending} onClick={() => a.resume.mutate()}>
                  {t.recorded.resume}
                </Button>
              ) : (
                <Button variant="outline" disabled={a.switchPlan.isPending} onClick={() => a.switchPlan.mutate(nextPlan)} >
                  {nextPlan === 'YEARLY' ? t.recorded.switchYearly : t.recorded.switchMonthly}
                </Button>
              )}
              <Button variant={s.status === 'PAST_DUE' ? 'ink' : 'outline'} disabled={a.portal.isPending} onClick={() => a.portal.mutate()}>
                {t.recorded.updateCard}
              </Button>
              {s.status !== 'CANCELLING' && (
                <Button variant="ghost" onClick={() => setConfirming(true)}>
                  {t.recorded.cancelPlan}
                </Button>
              )}
            </>
          )}
          {!lapsed && !waiting && apple && <p className="text-[13px] text-muted-foreground">{t.recorded.manageApple}</p>}
          {!lapsed && !waiting && transfer && (!pending || pending.status === 'REJECTED') && (
            <>
              <Button variant="outline" disabled={a.renew.isPending} onClick={() => a.renew.mutate('BANK_TRANSFER')}>
                {t.recorded.renewByTransfer}
              </Button>
              <Button variant="outline" disabled={a.switchToCard.isPending} onClick={() => a.switchToCard.mutate()}>
                {t.recorded.switchToCard}
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{t.recorded.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>{a.end ? fill(t.recorded.cancelBody, { date: a.end }) : t.recorded.cancelBodyNoDate}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.recorded.keepPlan}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={a.cancel.isPending}
              onClick={(e) => {
                e.preventDefault();
                a.cancel.mutate(undefined, { onSettled: () => setConfirming(false) });
              }}
            >
              {t.recorded.cancelPlan}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
