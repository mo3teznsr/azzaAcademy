'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useI18n } from '@/lib/i18n/provider';
import { LANDING_IMAGES } from './content';
import { useSequence } from './hooks';
import { Kicker, Seat } from './seat';
import { Wrap } from './wrap';

/** 5 · Stuck? Ask.: a small window grows full-bleed into a live session; captions arrive once it's open. */
export function Room() {
  const { t, dir } = useI18n();
  const r = t.landing.room;
  const seq = useSequence();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const inset = useTransform(p, [0, 0.5], [24, 0]);
  const side = useTransform(p, [0, 0.5], [30, 0]);
  const radius = useTransform(p, [0, 0.45], [28, 0]);
  const clipPath = useTransform([inset, side, radius], ([i, s, rad]) => `inset(${i}% ${s}% ${i}% ${s}% round ${rad}px)`);
  const scale = useTransform(p, [0, 0.6], [1.3, 1]);
  const sign = dir === 'rtl' ? -1 : 1;
  const startX = useTransform(p, [0, 0.4], ['0vw', `${-40 * sign}vw`]);
  const endX = useTransform(p, [0, 0.4], ['0vw', `${40 * sign}vw`]);
  const words = useTransform(p, [0.04, 0.3], [1, 0]);
  const ui = useTransform(p, [0.55, 0.72], [0, 1]);

  const captions = (
    <ul className="grid gap-6 md:grid-cols-3">
      {r.captions.map((c) => (
        <li key={c.k} className="flex flex-col gap-2 border-t border-current/25 pt-4">
          <span className="label-mono flex items-center gap-2">
            <Seat state="pulse" className="text-[13px]" /> {c.k}
          </span>
          <p className="text-[17px] leading-snug">{c.t}</p>
        </li>
      ))}
    </ul>
  );

  if (!seq) {
    return (
      <section ref={ref} aria-labelledby="room-title" className="theme-ink bg-ink-deep py-[clamp(4rem,10vw,8rem)] text-foreground">
        <Wrap className="flex flex-col gap-8">
          <Kicker className="text-mint">{r.kicker}</Kicker>
          <h2 id="room-title" className="font-display text-[clamp(44px,9vw,96px)] font-extrabold leading-[0.88]">
            {r.wordA} <span className="font-light text-mint">{r.wordB}</span>
          </h2>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] sm:aspect-[16/9]">
            <Image src={LANDING_IMAGES.room} alt={r.alt} fill sizes="100vw" className="object-cover" />
          </div>
          <p className="max-w-xl text-lg text-soft-foreground">{r.body}</p>
          {captions}
        </Wrap>
      </section>
    );
  }

  return (
    <section ref={ref} aria-labelledby="room-title" className="theme-ink relative h-[280vh] bg-ink-deep text-foreground">
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.p aria-hidden style={{ x: startX, opacity: words }} className="absolute start-[4vw] top-[9%] z-10 font-display text-[8vw] font-extrabold leading-none">
          {r.wordA}
        </motion.p>
        <motion.p aria-hidden style={{ x: endX, opacity: words }} className="absolute end-[4vw] bottom-[9%] z-10 font-display text-[8vw] font-light leading-none text-mint">
          {r.wordB}
        </motion.p>
        <motion.div className="absolute inset-0" style={{ clipPath }}>
          <motion.div className="absolute inset-0" style={{ scale }}>
            <Image src={LANDING_IMAGES.room} alt={r.alt} fill sizes="100vw" className="object-cover" />
          </motion.div>
          {/* A wash under the captions only (the room photo carries its own copy here, as the hero may). */}
          <motion.div style={{ opacity: ui }} className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-ink-deep via-ink-deep/75 to-transparent" />
          <motion.div style={{ opacity: ui }} className="absolute inset-x-0 bottom-0 text-cream">
            <Wrap className="flex flex-col gap-8 pb-[clamp(2rem,5vw,4rem)]">
              <Kicker className="text-mint">{r.kicker}</Kicker>
              <h2 id="room-title" className="max-w-4xl font-display text-[clamp(44px,6vw,96px)] font-extrabold leading-[0.88]">
                {r.wordA} <span className="font-light text-mint">{r.wordB}</span>
              </h2>
              <p className="max-w-xl text-lg text-cream/85">{r.body}</p>
              {captions}
            </Wrap>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
