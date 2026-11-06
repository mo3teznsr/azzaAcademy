'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { LANDING_IMAGES } from './content';
import { EASE, useCalm } from './hooks';
import { Kicker } from './seat';
import { Wrap } from './wrap';

const PROPOSE = '/studio/courses/new';

/** 11 · Teach on Azza: a split band. Teachers go straight to the proposal form; signed out → sign in first. */
export function Teach() {
  const { t, dir } = useI18n();
  const c = t.landing.teach;
  const { user, role } = useAuth();
  const calm = useCalm();
  const canPropose = role === 'TEACHER' || role === 'ADMIN';
  const cta = !user
    ? { href: `/sign-in?next=${encodeURIComponent(PROPOSE)}`, label: c.ctaSignedOut }
    : canPropose
      ? { href: PROPOSE, label: c.cta }
      : { href: 'mailto:teach@azza.live', label: c.ctaLearner };
  const from = dir === 'rtl' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';

  return (
    <section aria-labelledby="teach-title" className="py-[clamp(3rem,8vw,6rem)]">
      <Wrap>
        <div className="theme-ink grid overflow-hidden rounded-[28px] bg-ink-deep text-foreground lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-between gap-10 p-[clamp(1.75rem,5vw,4rem)]">
            <div className="flex flex-col gap-6">
              <Kicker className="text-mint">{c.kicker}</Kicker>
              <h2 id="teach-title" className="font-display text-[clamp(44px,6vw,96px)] font-extrabold leading-[0.88]">
                {c.titleA}
                <span className="block font-light text-mint">{c.titleB}</span>
              </h2>
              <p className="max-w-md text-lg text-soft-foreground">{c.body}</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {c.steps.map((s, i) => (
                <li key={s} className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <span className="timecode text-mint">{`0${i + 1}`}</span>
                  <span className="text-soft-foreground">{s}</span>
                </li>
              ))}
            </ol>
            <Button asChild size="lg" variant="sun" className="self-start">
              <Link href={cta.href}>
                {cta.label} <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
          <motion.div
            className="relative min-h-[320px] lg:min-h-full"
            initial={{ clipPath: from }}
            whileInView={{ clipPath: 'inset(0 0 0 0)' }}
            viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            transition={{ duration: calm ? 0 : 1.1, ease: EASE }}
          >
            <Image src={LANDING_IMAGES.teach} alt={c.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </motion.div>
        </div>
      </Wrap>
    </section>
  );
}
