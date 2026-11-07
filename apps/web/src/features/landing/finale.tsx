'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { Price } from '@/components/brand/price';
import { batchPriceFils } from '@/lib/schedule';
import { Accordion } from '../catalog/faq';
import { MagneticLink } from './magnetic-button';
import { Kicker, SeatRule } from './seat';
import { useOpenBatches } from './use-landing-data';
import { Wrap } from './wrap';

/** 12 · FAQ, the ticket line (`#pricing`, real lowest open price), then the magnetic "Find your batch" pill. */
export function Finale() {
  const { t } = useI18n();
  const l = t.landing;
  const { user } = useAuth();
  const { open } = useOpenBatches();
  const min = open.length ? Math.min(...open.map(batchPriceFils)) : null;
  const plans = [l.plans.full, l.plans.bank];

  return (
    <>
      <section aria-labelledby="faq-title" className="py-[clamp(4rem,9vw,7rem)]">
        <Wrap className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-5">
            <Kicker className="text-muted-foreground">{l.faqKicker}</Kicker>
            <h2 id="faq-title" className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.85]">
              {l.faqA}
              <span className="block font-light">{l.faqB}</span>
            </h2>
          </div>
          <Accordion items={l.faq} />
        </Wrap>
      </section>

      <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-8">
        <Wrap className="flex flex-col gap-8">
          <SeatRule />
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div className="flex flex-col gap-3">
              <span className="label-mono text-muted-foreground">{l.pricingKicker}</span>
              <h2 id="pricing-title" className="font-display text-[clamp(36px,4vw,56px)] font-extrabold leading-[0.95]">
                {l.pricingTitleA} <span className="font-light">{l.pricingTitleB}</span>
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {l.pricingBody} {min !== null && l.pricingFrom}
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
                <li key={plan.name} className="flex flex-col gap-3 rounded-[18px] border border-dashed border-line-strong p-5">
                  <span className="label-mono text-muted-foreground">{plan.name}</span>
                  {min !== null && <Price fils={min} template={plan.price.replace('{p}', '{amount}')} amountClassName="font-display text-3xl font-extrabold leading-none" />}
                  <p className="text-sm text-muted-foreground">{plan.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </Wrap>
      </section>

      <section aria-labelledby="final-title" className="pt-[clamp(5rem,12vw,10rem)]">
        <Wrap className="flex flex-col items-start gap-10">
          <h2 id="final-title" className="font-display text-[clamp(64px,12vw,200px)] font-extrabold leading-[0.82] tracking-[-0.04em]">
            {l.finalTitleA}
            <span className="block font-light text-sun-fg">{l.finalTitleB}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <MagneticLink href="#catalog">{l.finalPrimary}</MagneticLink>
            {!user && (
              <Link href="/sign-up" className="link-sun">
                {l.finalSecondary}
              </Link>
            )}
          </div>
          <p className="max-w-md text-muted-foreground">{l.finalBody}</p>
        </Wrap>
      </section>
    </>
  );
}

