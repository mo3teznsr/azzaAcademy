'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, CircleCheck, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import { yearlySavingMonths, type SubscriptionPlan } from '@azza/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Price } from '@/components/brand/price';
import { ErrorState } from '@/components/brand/states';
import { ApiError, isAppleProvider, isCardResult, learningApi, subscriptionsApi, type CourseDetail, type MySubscription, type SubscribeTransfer } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { useAuth } from '@/lib/auth/use-auth';
import { cn } from '@/lib/utils';
import { BankTransferDetails } from '../checkout/bank-details';

type Method = 'CARD' | 'BANK';

/** Today plus one billing period (a month or a year). */
function afterPeriod(plan: SubscriptionPlan): Date {
  const now = new Date();
  const months = plan === 'YEARLY' ? 12 : 1;
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1, now.getHours(), now.getMinutes());
  // Clamp to the last day of the target month (31 Jan + 1 month = 28/29 Feb).
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(now.getDate(), last));
  return d;
}

/**
 * The recorded course's plan picker: Monthly or Yearly, Card or Bank transfer, then one calm "Start learning".
 * A learner with access sees their plan instead (renewal date, Continue, Resume).
 */
export function PlanPicker({ course, subscription }: { course: CourseDetail; subscription: MySubscription | null }) {
  const [renewing, setRenewing] = useState(false);
  if (subscription?.hasAccess && !renewing) return <SubscriberPanel course={course} subscription={subscription} onRenew={() => setRenewing(true)} />;
  return <PlanForm course={course} subscription={subscription} renewing={renewing} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  // Ivory "paper" card in both themes, like the class seat panel; theme-cream gives its controls light-ground tokens.
  return (
    <Card id="plan-card" className="theme-cream h-fit gap-0 rounded-[24px] bg-ivory py-0 text-ink ring-0 light:border light:border-border lg:sticky lg:top-6">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">{children}</CardContent>
    </Card>
  );
}

function PlanForm({ course, subscription, renewing }: { course: CourseDetail; subscription: MySubscription | null; renewing: boolean }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  const qc = useQueryClient();
  const { isSignedIn, isPending: authPending } = useAuth();
  const monthly = course.monthlyPriceFils;
  const yearly = course.yearlyPriceFils;
  const [plan, setPlan] = useState<SubscriptionPlan>('MONTHLY');
  const [method, setMethod] = useState<Method>(renewing ? 'BANK' : 'CARD');
  const [transfer, setTransfer] = useState<SubscribeTransfer | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const start = useMutation({
    mutationFn: () => subscriptionsApi.subscribe(course.id, { plan, method: method === 'BANK' ? 'BANK_TRANSFER' : 'STRIPE', displayCurrency: money.currency }),
    onSuccess: (r) => {
      if (isCardResult(r)) {
        // Stripe's hosted page takes over; the webhook activates the plan and /learn/recorded/return waits for it.
        setRedirecting(true);
        window.location.assign(r.checkoutUrl);
        return;
      }
      setTransfer(r);
    },
    onError: (e: Error) => {
      if (e instanceof ApiError && e.code === 'ALREADY_SUBSCRIBED') {
        toast.error(t.recorded.alreadySubscribed);
        void qc.invalidateQueries({ queryKey: qk.mySubscriptions });
      }
    },
  });

  if (monthly == null || yearly == null) return null;
  const saving = yearlySavingMonths(monthly, yearly);
  const chosen = plan === 'YEARLY' ? yearly : monthly;
  const date = f.dayMonth(afterPeriod(plan));
  const options = [
    { v: 'MONTHLY' as const, title: t.recorded.monthly, fils: monthly, template: t.recorded.perMonth, sub: null as string | null },
    {
      v: 'YEARLY' as const,
      title: t.recorded.yearly,
      fils: yearly,
      template: t.recorded.perYear,
      sub: `${fill(t.recorded.yearlyPerMonth, { amount: money.display(Math.round(yearly / 12)) })}`,
    },
  ];
  const href = `/sign-in?next=${encodeURIComponent(`/courses/${course.slug}#plan`)}`;

  if (transfer) {
    return (
      <Shell>
        {uploaded ? (
          <div role="status" className="flex flex-col gap-3">
            <CircleCheck className="size-7 text-green-deep" aria-hidden />
            <b className="font-display text-2xl font-extrabold">{t.recorded.receiptSentTitle}</b>
            <p className="text-sm text-stone-2">{t.recorded.receiptSentBody}</p>
            <Button asChild variant="ink" size="lg">
              <Link href="/learn">{t.checkout.goToLearning}</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-2">{t.recorded.transferNote}</p>
            <BankTransferDetails
              order={{ id: transfer.paymentId, totalFils: transfer.amountFils }}
              bankAccount={transfer.bankAccount}
              reference={transfer.reference}
              expiresAt={transfer.expiresAt}
              heldLabel={t.recorded.transferHeld}
              uploadFile={(file) => subscriptionsApi.uploadReceiptFile(transfer.paymentId, file)}
              onUploaded={() => {
                setUploaded(true);
                void qc.invalidateQueries({ queryKey: qk.mySubscriptions });
              }}
            />
          </>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      {subscription?.status === 'EXPIRED' && (
        <p role="status" className="rounded-xl bg-sage px-4 py-3 text-sm font-semibold text-ink">
          {t.recorded.ended}
        </p>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="label-mono mb-3 text-stone-2">{t.recorded.planLabel}</legend>
        <RadioGroup value={plan} onValueChange={(v) => setPlan(v as SubscriptionPlan)} className="gap-3">
          {options.map((o) => (
            <label
              key={o.v}
              className={cn(
                'flex min-h-16 cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-colors',
                plan === o.v ? 'border-ink bg-white' : 'border-cream-line hover:border-line-strong',
              )}
            >
              <RadioGroupItem value={o.v} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-base">{o.title}</b>
                  {o.v === 'YEARLY' && saving > 0 && <Badge className="bg-green text-ink-deep">{f.plural(saving, t.recorded.saveMonths)}</Badge>}
                </span>
                {o.sub && <span className="text-[13px] text-stone-2">{o.sub}</span>}
              </span>
              <Price
                fils={o.fils}
                template={o.template}
                align="end"
                className="shrink-0 text-end"
                amountClassName="font-display text-xl font-extrabold"
                noteClassName="text-stone-2"
              />
            </label>
          ))}
        </RadioGroup>
        <p className="text-xs text-stone-2">{t.recorded.vat}</p>
      </fieldset>

      <section aria-labelledby="plan-gets" className="flex flex-col gap-2.5 border-t border-cream-line pt-5">
        <h3 id="plan-gets" className="label-mono text-stone-2">
          {t.recorded.youGet}
        </h3>
        <ul className="flex flex-col gap-2 text-[15px]">
          {[t.recorded.getLessons, t.recorded.getCertificate, t.recorded.getCancel].map((line) => (
            <li key={line} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-green-deep" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <fieldset className="flex flex-col gap-3 border-t border-cream-line pt-5">
        <legend className="label-mono mb-3 text-stone-2">{t.recorded.payWith}</legend>
        <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="gap-3">
          {(
            [
              { v: 'CARD', icon: CreditCard, title: t.recorded.card, sub: t.recorded.cardSub },
              { v: 'BANK', icon: Landmark, title: t.recorded.bank, sub: t.recorded.bankSub },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl border p-4 transition-colors',
                method === o.v ? 'border-ink bg-white' : 'border-cream-line hover:border-line-strong',
              )}
            >
              <RadioGroupItem value={o.v} />
              <o.icon className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <b className="block">{o.title}</b>
                <span className="text-[13px] text-stone-2">{o.sub}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {method === 'BANK' && (
          <p role="note" className="rounded-xl bg-peach px-4 py-3 text-sm text-ink">
            {t.recorded.transferNote}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5 border-t border-cream-line pt-5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{method === 'CARD' ? fill(t.recorded.nextCharge, { date }) : fill(t.recorded.paidThrough, { date })}</span>
          <Price fils={chosen} align="end" amountClassName="font-display text-2xl font-extrabold" noteClassName="text-stone-2" />
        </div>
        <p className="text-[13px] text-stone-2">{t.recorded.cancelLine}</p>
      </div>

      {start.isError && !(start.error instanceof ApiError && start.error.code === 'ALREADY_SUBSCRIBED') && <ErrorState compact error={start.error} />}
      {!isSignedIn && !authPending ? (
        <Button asChild variant="ink" size="lg" className="w-full">
          <Link href={href}>{t.recorded.signInToStart}</Link>
        </Button>
      ) : (
        <Button variant="ink" size="lg" className="w-full" disabled={start.isPending || redirecting} onClick={() => start.mutate()}>
          {redirecting ? t.recorded.redirecting : start.isPending ? t.recorded.working : method === 'BANK' ? t.recorded.getBankDetails : t.recorded.start}
        </Button>
      )}
      {method === 'CARD' && (
        <p className="flex items-center gap-1.5 text-[13px] text-stone-2">
          <ShieldCheck className="size-4 shrink-0" aria-hidden /> {t.checkout.secured}
        </p>
      )}
    </Shell>
  );
}

/** A learner with access: their plan, when it renews or ends, and Continue. */
function SubscriberPanel({ course, subscription, onRenew }: { course: CourseDetail; subscription: MySubscription; onRenew: () => void }) {
  const { t, f, fill } = useI18n();
  const qc = useQueryClient();
  const lessons = useQuery({ queryKey: qk.lessons(course.id), queryFn: () => learningApi.lessons(course.id), retry: false });
  const nextId = lessons.data?.progress.nextLesson?.id ?? lessons.data?.modules.flatMap((m) => m.lessons)[0]?.id;
  const cardPlan = subscription.provider === 'STRIPE';
  const apple = isAppleProvider(subscription.provider);
  const transfer = subscription.provider === 'BANK_TRANSFER';
  const end = subscription.currentPeriodEnd ? f.dayMonth(subscription.currentPeriodEnd) : null;
  const ending = subscription.status === 'CANCELLING' || transfer;
  const resume = useMutation({
    mutationFn: () => subscriptionsApi.resume(subscription.id),
    onSuccess: () => (toast.success(t.recorded.resumed, { id: `plan-${subscription.id}` }), void qc.invalidateQueries({ queryKey: qk.mySubscriptions })),
    onError: (e: Error) => toast.error(e.message),
  });
  const portal = useMutation({
    mutationFn: () => subscriptionsApi.portal(subscription.id),
    onSuccess: (r) => window.location.assign(r.url),
    onError: (e: Error) => toast.error(e.message),
  });
  const line = subscription.status === 'PAST_DUE' ? t.recorded.pastDue : end ? fill(ending ? t.recorded.ends : t.recorded.renews, { date: end }) : null;
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-mono text-stone-2">{t.recorded.yourPlan}</span>
        <Badge className="bg-green text-ink-deep">{subscription.plan === 'YEARLY' ? t.recorded.planYearly : t.recorded.planMonthly}</Badge>
      </div>
      {line && (
        <p role="status" className={cn('text-base font-semibold', subscription.status === 'PAST_DUE' && 'rounded-xl bg-peach px-4 py-3 text-sm')}>
          {line}
        </p>
      )}
      <Button asChild variant="ink" size="lg" className="w-full">
        <Link href={nextId ? `/learn/courses/${course.id}?lesson=${nextId}` : `/learn/courses/${course.id}`}>{t.recorded.continue}</Link>
      </Button>
      <div className="flex flex-wrap gap-2">
        {subscription.status === 'CANCELLING' && cardPlan && (
          <Button variant="outline" disabled={resume.isPending} onClick={() => resume.mutate()}>
            {t.recorded.resume}
          </Button>
        )}
        {subscription.status === 'PAST_DUE' && cardPlan && (
          <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>
            {t.recorded.updateCard}
          </Button>
        )}
        {apple && <p className="text-[13px] text-stone-2">{t.recorded.manageApple}</p>}
        {transfer && (
          <Button variant="outline" onClick={onRenew}>
            {t.recorded.renewByTransfer}
          </Button>
        )}
      </div>
    </Shell>
  );
}
