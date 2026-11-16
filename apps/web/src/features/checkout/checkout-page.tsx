'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BadgeCheck, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import type { CheckoutInput, PaymentMethod } from '@azza/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CourseCover } from '@/components/brand/course-cover';
import { Price } from '@/components/brand/price';
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
import { useCategoryLabel } from '@/components/brand/category';
import { WhatsAppButton } from '@/components/brand/whatsapp-button';
import { readAttribution, track } from '@/lib/analytics';

/** Card covers Apple Pay and Google Pay too: Stripe's page offers them. TABBY appears only when Tabby says yes. */
type Choice = 'CARD' | 'BANK' | 'TABBY';
const methodOf = (c: Choice): PaymentMethod => (c === 'BANK' ? 'BANK_TRANSFER' : c === 'TABBY' ? 'TABBY' : 'STRIPE');

export function CheckoutPage({ batchId }: { batchId: string }) {
  const { t } = useI18n();
  const batch = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });
  if (batch.isPending) return <LoadingBlock rows={3} height={160} />;
  if (batch.isError) return <ErrorState error={batch.error} onRetry={() => void batch.refetch()} />;
  if (!['ENROLLING', 'RUNNING', 'FULL'].includes(batch.data.status)) return <ErrorState error={new ApiError(409, 'NOT_OPEN', t.checkout.notOpen)} />;
  return <Checkout batch={batch.data} />;
}

function Checkout({ batch }: { batch: BatchDetail }) {
  const { t, f, fill, pick, locale } = useI18n();
  const categoryLabel = useCategoryLabel();
  const money = useMoney();
  const router = useRouter();
  const [picked, setChoice] = useState<Choice>('CARD');
  // A campaign link can carry the code: /checkout/<batch>?coupon=RAMADAN20 applies it at once.
  const linked = useSearchParams().get('coupon')?.trim().toUpperCase() || undefined;
  const [couponDraft, setCouponDraft] = useState(linked ?? '');
  const [coupon, setCoupon] = useState<string | undefined>(linked);
  // Tabby pre-scoring for this student and total. Hidden when Tabby isn't configured or the check failed; shown
  // as unavailable with Tabby's own message when Tabby declines (amount limits, no phone on the profile).
  const tabby = useQuery({
    queryKey: ['tabby-eligibility', batch.id, coupon ?? '', locale],
    queryFn: () => checkoutApi.tabbyEligibility({ batchId: batch.id, couponCode: coupon, lang: locale }),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const tabbyShown = !!tabby.data && tabby.data.reason !== 'NOT_CONFIGURED';
  const tabbyOk = tabby.data?.available === true;
  const choice: Choice = picked === 'TABBY' && !tabbyOk ? 'CARD' : picked;
  const [bankAccountId, setBankAccountId] = useState<string | undefined>();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const input: CheckoutInput = { batchId: batch.id, method: methodOf(choice), couponCode: coupon, displayCurrency: money.currency, bankAccountId };
  useEffect(() => {
    track('begin_checkout', { item_id: batch.course.slug, item_name: batch.course.titleEn });
  }, [batch.course.slug, batch.course.titleEn]);
  const quote = useQuery({
    queryKey: ['quote', batch.id, input.method, coupon ?? '', money.currency],
    queryFn: () => checkoutApi.quote(input),
    retry: false,
  });
  const banks = useQuery({ queryKey: qk.bankAccounts, queryFn: checkoutApi.bankAccounts, enabled: choice === 'BANK' });
  const selectedBank = bankAccountId ?? banks.data?.[0]?.id;

  const start = useMutation({
    mutationFn: () => checkoutApi.checkout({ ...input, bankAccountId: choice === 'BANK' ? selectedBank : undefined, attribution: readAttribution() ?? undefined }),
    onSuccess: (r) => {
      // Card / wallets / Tabby: the hosted page takes over; the API confirms the order, /checkout/return shows it.
      if (isStripeResult(r)) {
        setRedirecting(true);
        window.location.assign(r.checkoutUrl);
        return;
      }
      setResult(r);
    },
  });

  const total = quote.data?.totalFils;
  const title = pick(batch.course.titleEn, batch.course.titleAr).text;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-end gap-4">
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
            <h1 id="pay-title" className="font-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[0.9]">
              {t.checkout.titleA} <span className="font-light">{t.checkout.titleB}</span> <bdi dir="ltr">{batch.code}.</bdi>
            </h1>
          </div>

          {!result && (
            <>
              <h2 className="font-semibold">{t.checkout.choose}</h2>
              <RadioGroup value={choice} onValueChange={(v) => setChoice(v as Choice)} className="grid gap-3">
                {(
                  [
                    { v: 'CARD', icon: CreditCard, title: t.checkout.card, sub: t.checkout.cardSub, disabled: false },
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
                {tabbyShown && tabby.data && (
                  <label
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 transition-colors',
                      choice === 'TABBY' ? 'border-foreground bg-card' : 'border-border',
                      tabbyOk ? 'cursor-pointer hover:border-line-strong' : 'cursor-not-allowed',
                    )}
                  >
                    <RadioGroupItem value="TABBY" disabled={!tabbyOk} aria-describedby="tabby-sub" />
                    <TabbyMark />
                    <span className="flex-1">
                      <b className="block">{t.checkout.tabby.name}</b>
                      <span id="tabby-sub" className="text-sm text-muted-foreground">
                        {tabbyOk ? (
                          <>
                            {fill(t.checkout.tabby.sub, { amount: money.aed(tabby.data.installmentFils) })}{' '}
                            {tabby.data.learnMoreUrl && (
                              <a href={tabby.data.learnMoreUrl} target="_blank" rel="noopener noreferrer" className="link-sun">
                                {t.checkout.tabby.learnMore}
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {t.checkout.tabby.unavailable[tabby.data.reason as keyof typeof t.checkout.tabby.unavailable] ?? t.checkout.tabby.unavailable.not_available}{' '}
                            {tabby.data.reason === 'PHONE_REQUIRED' && (
                              <Link href="/settings" className="link-sun">
                                {t.checkout.tabby.addPhone}
                              </Link>
                            )}
                          </>
                        )}
                      </span>
                    </span>
                  </label>
                )}
              </RadioGroup>

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

              {start.isError && <ErrorState compact error={tabbyError(start.error, t.checkout.tabby.unavailable) ?? start.error} />}
              <Button size="lg" onClick={() => start.mutate()} disabled={start.isPending || redirecting || quote.isError || (choice === 'BANK' && !selectedBank)}>
                {redirecting
                  ? choice === 'TABBY'
                    ? t.checkout.tabby.redirecting
                    : t.checkoutReturn.redirecting
                  : start.isPending
                    ? t.checkout.paying
                    : choice === 'BANK'
                      ? t.checkout.getBankDetails
                      : choice === 'TABBY'
                        ? t.checkout.tabby.continue
                        : t.checkout.continueCard}
              </Button>
              {choice === 'CARD' && (
                <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0" /> {t.checkout.secured}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                <span>{t.checkout.questions}</span>
                <WhatsAppButton course={title} batchCode={batch.code} size="sm" />
              </div>
            </>
          )}

          {result?.waitlisted && <WaitlistedNotice code={batch.code} />}
          {result && !result.waitlisted && !isStripeResult(result) && (
            <BankTransferDetails
              order={result.order}
              bankAccount={result.bankAccount}
              reference={result.reference}
              expiresAt={result.expiresAt}
              onUploaded={() => router.push(`/orders/${result.order.id}`)}
            />
          )}
          {result && !result.waitlisted && !isStripeResult(result) && (
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
              <span>{t.checkout.transferHelp}</span>
              <WhatsAppButton course={title} batchCode={batch.code} size="sm" />
            </div>
          )}
        </section>

        <aside className="flex h-fit flex-col gap-5 rounded-[24px] border border-border bg-card p-6 lg:sticky lg:top-6" aria-labelledby="summary">
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
          <p className="flex items-start gap-2 rounded-2xl bg-secondary p-3 text-[13px]">
            <BadgeCheck className="mt-0.5 size-4 shrink-0" /> <span><b>{t.checkout.guaranteeTitle}</b> {t.checkout.guaranteeBody}</span>
          </p>
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
            {tabbyOk && (
              <p className="text-muted-foreground">
                <b className="text-foreground">{t.checkout.tabby.name}: </b>
                {t.checkout.tabby.next}
              </p>
            )}
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

/** `TABBY_REJECTED` (with `details.reason`) and `PHONE_REQUIRED` → Tabby's approved message (null for any other error). */
function tabbyError(error: unknown, messages: Record<string, string>): ApiError | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'PHONE_REQUIRED') return new ApiError(error.status, error.code, messages.PHONE_REQUIRED ?? error.message, error.details);
  if (error.code !== 'TABBY_REJECTED') return null;
  const reason = (error.details as { reason?: string } | undefined)?.reason ?? 'not_available';
  return new ApiError(error.status, error.code, messages[reason] ?? messages.not_available ?? error.message, error.details);
}

/** Text-only Tabby mark (no logo asset is bundled); Latin wordmark kept left-to-right in Arabic. */
function TabbyMark() {
  return (
    <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-md border border-foreground px-1 text-[11px] font-bold lowercase leading-none" dir="ltr">
      tabby
    </span>
  );
}

function Summary({ quote, pending, error }: { quote: Quote | undefined; pending: boolean; error: unknown }) {
  const { t, fill } = useI18n();
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
        <dd>
          <Price fils={quote.totalFils} align="end" amountClassName="font-display text-3xl font-extrabold" />
        </dd>
      </div>
    </dl>
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
