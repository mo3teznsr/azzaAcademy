'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useInView } from 'motion/react';
import { LogoMark } from '@/components/brand/signal-mark';
import { useI18n } from '@/lib/i18n/provider';
import { LANDING_IMAGES, SAMPLE_CERT_CODE } from './content';
import { useCalm } from './hooks';
import { Kicker, Seat } from './seat';
import { Wrap } from './wrap';

/** 10 · Finish line: a sample certificate; its seal draws in and the verify link types itself out. */
export function Certificate() {
  const { t, f, fill } = useI18n();
  const c = t.landing.certificate;
  const calm = useCalm();
  const card = useRef<HTMLDivElement>(null);
  const inView = useInView(card, { once: true, margin: '0px 0px -20% 0px' });
  const host = useSyncExternalStore(noop, () => window.location.host, () => '');
  const url = `${host}/verify/${SAMPLE_CERT_CODE}`;
  const typed = useTyped(url, inView && !calm);
  const shown = calm ? url : typed;

  return (
    <section aria-labelledby="finish-title" className="bg-raised-2/60 py-[clamp(4rem,10vw,8rem)]">
      <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Kicker className="text-muted-foreground">{c.kicker}</Kicker>
          <h2 id="finish-title" className="font-display text-[clamp(48px,7vw,112px)] font-extrabold leading-[0.86]">
            {c.titleA}
            <span className="block font-light text-sun-fg">{c.titleB}</span>
          </h2>
          <p className="max-w-md text-lg text-soft-foreground">{t.certificates.rule}</p>
          <div className="relative hidden aspect-[4/5] max-w-sm overflow-hidden rounded-[24px] shadow-media lg:block">
            <Image src={LANDING_IMAGES.finish} alt={c.alt} fill sizes="380px" className="object-cover" />
          </div>
        </div>

        <div ref={card} className="relative flex flex-col gap-8 rounded-[24px] border border-border bg-card p-[clamp(1.5rem,4vw,3rem)] text-card-foreground shadow-card">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="label-mono text-muted-foreground">{t.certificates.sheetKicker}</span>
              <span className="label-mono rounded-full border border-border px-2.5 py-1 text-muted-foreground self-start">{c.sample}</span>
            </div>
            <Seal play={inView} calm={calm} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">{t.certificates.sheetAwarded}</span>
            <b className="font-display text-[clamp(32px,4vw,52px)] font-extrabold leading-none">{c.holder}</b>
            <span className="text-sm text-muted-foreground">{t.certificates.sheetFor}</span>
            <b className="font-display text-2xl">{c.course}</b>
          </div>
          <div aria-hidden className="flex flex-wrap gap-1.5 text-[16px]">
            {Array.from({ length: 12 }, (_, i) => (
              <Seat key={i} state={i < 11 ? 'lit' : 'empty'} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{fill(t.certificates.sheetAttended, { a: f.number(11), b: f.number(12) })}</p>
          <div className="flex flex-col gap-2 border-t border-border pt-6">
            <span className="text-sm text-muted-foreground">{c.verifyLead}</span>
            <Link href="/verify" className="link-sun timecode self-start text-base break-all" aria-label={`${c.verifyCta}: ${url}`}>
              <span aria-hidden>
                {shown}
                {!calm && shown.length < url.length && <span className="landing-caret" />}
              </span>
            </Link>
          </div>
          <LogoMark className="absolute bottom-6 end-6 hidden h-8 text-muted-foreground/40 sm:block" />
        </div>
      </Wrap>
    </section>
  );
}

const noop = () => () => {};

/** The seal: two rings and a check that draw with an SVG stroke. */
function Seal({ play, calm }: { play: boolean; calm: boolean }) {
  const draw = (delay: number) => ({
    initial: { pathLength: calm ? 1 : 0 },
    animate: { pathLength: play || calm ? 1 : 0 },
    transition: { duration: calm ? 0 : 1.2, delay: calm ? 0 : delay, ease: [0.23, 1, 0.32, 1] as const },
  });
  return (
    <svg aria-hidden viewBox="0 0 96 96" className="size-[clamp(72px,9vw,104px)] shrink-0 text-sun-fg" fill="none">
      <motion.circle cx="48" cy="48" r="44" transform="rotate(-90 48 48)" stroke="currentColor" strokeWidth="2.5" {...draw(0)} />
      <motion.circle cx="48" cy="48" r="35" transform="rotate(-90 48 48)" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" {...draw(0.3)} />
      <motion.path d="M34 49 L44 59 L63 38" stroke="var(--green)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" {...draw(0.7)} />
    </svg>
  );
}

/** Types `text` out once `play` turns true. */
function useTyped(text: string, play: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 1)), 45);
    return () => window.clearInterval(id);
  }, [play, text]);
  return text.slice(0, n);
}
