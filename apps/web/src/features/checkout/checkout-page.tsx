'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Landmark, Smartphone, ShieldCheck } from 'lucide-react';
import type { CheckoutInput, PaymentMethod } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourseCover } from '@/components/brand/course-cover';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { CurrencySwitcher } from '@/components/brand/switchers';
import { batchesApi, checkoutApi, isStripeResult, type BatchDetail, type CheckoutResult, type Quote } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { describeRule } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { BankTransferDetails } from './bank-details';
import { useTheme } from '@/lib/theme/provider';
import { getStripe, stripeAppearance, stripeConfigured } from './stripe';
import { useCategoryLabel } from '@/components/brand/category';

type Choice = 'CARD' | 'WALLET' | 'BANK';
const methodOf = (c: Choice): PaymentMethod => (c === 'BANK' ? 'BANK_TRANSFER' : 'STRIPE');

export function CheckoutPage({ batchId }: { batchId: string }) {
  const { t } = useI18n();
  const batch = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });
  if (batch.isPending) return <LoadingBlock rows={3} height={160} />;
  if (batch.isError) return <ErrorState error={batch.error} onRetry={() => void batch.refetch()} />;
  if (!['ENROLLING', 'RUNNING', 'FULL'].includes(batch.data.status)) return <ErrorState error={new ApiError(409, 'NOT_OPEN', t.checkout.notOpen)} />;
  return <Checkout batch={batch.data} />;
}

function Stepper({ current }: { current: number }) {
  const { t, f } = useI18n();
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Checkout steps">
      {t.checkout.steps.map((label, i) => (
        <li
          key={label}
          aria-current={i + 1 === current ? 'step' : undefined}
          className={cn(
            'label-mono flex h-8 items-center gap-2 rounded-full px-3',
            i + 1 < current && 'bg-secondary text-foreground',
            i + 1 === current && 'bg-primary text-primary-foreground',
            i + 1 > current && 'border border-border text-muted-foreground',
          )}
        >
          {f.number(i + 1)} · {label}
        </li>
      ))}
    </ol>
  );
}

function Checkout({ batch }: { batch: BatchDetail }) {
  const { t, f, fill, pick } = useI18n();
  const categoryLabel = useCategoryLabel();
  const money = useMoney();
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>(stripeConfigured ? 'CARD' : 'BANK');
  const [couponDraft, setCouponDraft] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [bankAccountId, setBankAccountId] = useState<string | undefined>();
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const input: CheckoutInput = { batchId: batch.id, method: methodOf(choice), couponCode: coupon, displayCurrency: money.currency, bankAccountId };
  const quote = useQuery({
    queryKey: ['quote', batch.id, input.method, coupon ?? '', money.currency],
    queryFn: () => checkoutApi.quote(input),
    retry: false,
  });
  const banks = useQuery({ queryKey: qk.bankAccounts, queryFn: checkoutApi.bankAccounts, enabled: choice === 'BANK' });
  const selectedBank = bankAccountId ?? banks.data?.[0]?.id;

  const start = useMutation({
    mutationFn: () => checkoutApi.checkout({ ...input, bankAccountId: choice === 'BANK' ? selectedBank : undefined }),
    onSuccess: setResult,
  });

  const total = quote.data?.totalFils;
  const title = pick(batch.course.titleEn, batch.course.titleAr).text;
  const step = 3;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Stepper current={step} />
        <CurrencySwitcher />
      </div>
      <div className="rounded-2xl bg-sun p-4 text-ink">
        <b>
          {t.checkout.chargedPrefix} {total !== undefined ? money.aed(total) : '…'}
        </b>
        . {t.checkout.chargedNote}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-6" aria-labelledby="pay-title">
          <div>
            <span className="label-mono text-muted-foreground">{fill(t.checkout.stepOf, { n: f.number(3), label: t.checkout.steps[2] ?? '' })}</span>
            <h1 id="pay-title" className="mt-2 font-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[0.9]">
              {t.checkout.titleA} <span className="font-light">{t.checkout.titleB}</span> <bdi dir="ltr">{batch.code}.</bdi>
            </h1>
          </div>

          {!result && (
            <>
              <h2 className="font-semibold">{t.checkout.choose}</h2>
              <RadioGroup value={choice} onValueChange={(v) => setChoice(v as Choice)} className="grid gap-3">
                {(
                  [
                    { v: 'CARD', icon: CreditCard, title: t.checkout.card, sub: t.checkout.cardSub, disabled: !stripeConfigured },
                    { v: 'WALLET', icon: Smartphone, title: t.checkout.wallets, sub: t.checkout.walletsSub, disabled: !stripeConfigured },
                    { v: 'BANK', icon: Landmark, title: t.checkout.bank, sub: t.checkout.bankSub, disabled: false },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.v}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors',
                      choice === o.v ? 'border-foreground bg-card' : 'border-border hover:border-line-strong',
                      o.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <RadioGroupItem value={o.v} disabled={o.disabled} />
                    <o.icon className="size-5" />
                    <span className="flex-1">
                      <b className="block">{o.title}</b>
                      <span className="text-sm text-muted-foreground">{o.sub}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              {!stripeConfigured && <p className="text-sm text-peach-fg">{t.checkout.stripeMissing}</p>}

              {choice === 'BANK' && (
                <div className="flex flex-col gap-2">
                  {banks.isPending ? (
                    <LoadingBlock rows={1} height={48} />
                  ) : banks.isError ? (
                    <ErrorState compact error={banks.error} onRetry={() => void banks.refetch()} />
                  ) : banks.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.checkout.noBankAccounts}</p>
                  ) : (
                    <Select value={selectedBank} onValueChange={setBankAccountId}>
                      <SelectTrigger className="w-full" aria-label={t.checkout.bankTitle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.data.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bankName} · <span dir="ltr">{b.iban}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {start.isError && <ErrorState compact error={start.error} />}
              <Button
                size="lg"
                onClick={() => start.mutate()}
                disabled={start.isPending || quote.isError || (choice === 'BANK' ? !selectedBank : !stripeConfigured)}
              >
                {start.isPending ? t.checkout.paying : choice === 'BANK' ? t.checkout.getBankDetails : t.checkout.continueCard}
              </Button>
            </>
          )}

          {result?.waitlisted && <WaitlistedNotice code={batch.code} />}
          {result && isStripeResult(result) && (
            <StripePayment clientSecret={result.clientSecret} orderId={result.order.id} totalFils={result.order.totalFils} />
          )}
          {result && !result.waitlisted && !isStripeResult(result) && (
            <BankTransferDetails
              order={result.order}
              bankAccount={result.bankAccount}
              reference={result.reference}
              expiresAt={result.expiresAt}
              onUploaded={() => router.push(`/orders/${result.order.id}`)}
            />
          )}
        </section>

        <aside className="flex h-fit flex-col gap-5 rounded-[24px] bg-card p-6 lg:sticky lg:top-6" aria-labelledby="summary">
          <h2 id="summary" className="label-mono text-muted-foreground">
            {t.checkout.summary}
          </h2>
          <div className="flex gap-4">
            <CourseCover course={batch.course} size="sm" showMeta={false} className="h-24 w-24 shrink-0 p-2" />
            <div className="min-w-0">
              <span className="label-mono text-muted-foreground" dir="ltr">
                {categoryLabel(batch.course)} · {batch.code}
              </span>
              <b className="block text-lg leading-tight">{title}</b>
              <span className="text-[13px] text-muted-foreground">
                <bdi>{batch.teacher.name}</bdi> · {describeRule(batch, f)}
              </span>
              <span className="block text-[13px] text-muted-foreground">
                {f.dayMonth(batch.startsOn)} → {f.dayMonth(batch.endsOn)} · {f.plural(batch.sessions.length, t.common.sessions)}
              </span>
            </div>
          </div>
          <Summary quote={quote.data} pending={quote.isPending} error={quote.error} />
          {!result && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setCoupon(couponDraft.trim().toUpperCase() || undefined);
              }}
            >
              <Input value={couponDraft} onChange={(e) => setCouponDraft(e.target.value)} placeholder={t.checkout.coupon} aria-label={t.checkout.coupon} dir="ltr" className="uppercase" />
              <Button type="submit" variant="outline">
                {coupon && coupon === couponDraft.trim().toUpperCase() ? t.checkout.couponApplied : t.checkout.applyCoupon}
              </Button>
            </form>
          )}
          <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
            <b>{t.checkout.nextTitle}</b>
            <p className="text-muted-foreground">
              <b className="text-foreground">{t.checkout.card}: </b>
              {t.checkout.nextCard}
            </p>
            <p className="text-muted-foreground">
              <b className="text-foreground">{t.checkout.bank}: </b>
              {t.checkout.nextBank}
            </p>
            <p className="text-muted-foreground">
              <b className="text-foreground">{t.checkout.refunds}: </b>
              {t.checkout.refundsBody}
            </p>
          </div>
          <Link href={`/courses/${batch.course.slug}`} className="link-sun text-sm">
            {t.common.back}
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** `COUPON_INVALID` → the same error with a localised message for its `details.reason` (null for any other error). */
function couponError(error: unknown, messages: Record<string, string>, withAmount: (template: string, fils: number) => string): ApiError | null {
  if (!(error instanceof ApiError) || error.code !== 'COUPON_INVALID') return null;
  const details = (error.details ?? {}) as { reason?: string; minOrderFils?: number };
  const template = details.reason ? messages[details.reason] : undefined;
  if (!template) return null;
  const message = details.minOrderFils != null ? withAmount(template, details.minOrderFils) : template;
  return new ApiError(error.status, error.code, message, error.details);
}

function Summary({ quote, pending, error }: { quote: Quote | undefined; pending: boolean; error: unknown }) {
  const { t, f, fill } = useI18n();
  const money = useMoney();
  if (pending) return <LoadingBlock rows={3} height={28} />;
  if (error || !quote) return <ErrorState compact error={couponError(error, t.checkout.couponErrors, (template, fils) => fill(template, { amount: money.aed(fils) })) ?? error ?? new Error(t.checkout.quoteError)} />;
  const rows: Array<[string, number]> = [[t.checkout.subtotal, quote.subtotalFils]];
  if (quote.discountFils) rows.push([t.checkout.discount, -quote.discountFils]);
  if (quote.vatFils) rows.push([t.checkout.vat, quote.vatFils]);
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v < 0 ? `− ${money.aed(-v)}` : money.aed(v)}</dd>
        </div>
      ))}
      <div className="mt-2 flex items-end justify-between gap-2 border-t border-border pt-3">
        <dt className="font-semibold">{t.checkout.total}</dt>
        <dd className="text-end">
          <b className="font-display text-3xl font-extrabold">{money.aed(quote.totalFils)}</b>
          {quote.display.currency !== 'AED' && (
            <span className="block text-xs text-muted-foreground">
              {fill(t.checkout.rateNote, {
                amount: `${quote.display.currency} ${f.number(quote.display.amount, { maximumFractionDigits: 2 })}`,
                rate: f.number(quote.display.rate, { maximumFractionDigits: 4 }),
                cur: quote.display.currency,
              })}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function StripePayment({ clientSecret, orderId, totalFils }: { clientSecret: string; orderId: string; totalFils: number }) {
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const stripe = getStripe();
  if (!stripe) return <p className="text-sm text-peach-fg">{t.checkout.stripeMissing}</p>;
  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance: stripeAppearance(resolved), locale: locale === 'ar' ? 'ar' : 'en' }}>
      <StripeForm orderId={orderId} totalFils={totalFils} />
    </Elements>
  );
}

function StripeForm({ orderId, totalFils }: { orderId: string; totalFils: number }) {
  const { t, fill } = useI18n();
  const money = useMoney();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}` },
      redirect: 'if_required',
    });
    setBusy(false);
    if (err) setError(err.message ?? t.checkout.orderFailedSub);
    else router.push(`/orders/${orderId}`);
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-extrabold">{t.checkout.cardDetails}</h3>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <ShieldCheck className="size-4" /> {t.checkout.secured}
        </span>
      </div>
      <PaymentElement />
      {error && (
        <div role="alert" className="rounded-[14px] border border-danger-line bg-danger-bg p-3 text-sm text-danger-fg">
          <b>{error}</b> {t.checkout.orderFailedSub}
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{t.checkout.threeDs}</p>
      <Button type="submit" size="lg" disabled={!stripe || busy}>
        {busy ? t.checkout.paying : fill(t.checkout.pay, { amount: money.aed(totalFils) })}
      </Button>
    </form>
  );
}

function WaitlistedNotice({ code }: { code: string }) {
  const { t, fill } = useI18n();
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-peach p-5 text-ink">
      <b className="text-lg">{fill(t.course.waitlistJoined, { code })}</b>
      <p className="text-sm">{t.course.waitlistBody}</p>
      <Button asChild variant="ink" className="w-fit">
        <Link href="/learn">{t.checkout.goToLearning}</Link>
      </Button>
    </div>
  );
}
