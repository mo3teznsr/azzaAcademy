'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { EASE, useSequence } from './hooks';
import { Seat } from './seat';
import { Wrap } from './wrap';

/** 4 · Course · Batch · Session: the page's one lime band. A sticky word sequence; stacked cards on mobile. */
export function Words() {
  const { t, f } = useI18n();
  const w = t.landing.words;
  const seq = useSequence();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(p, 'change', (v) => setIdx(Math.min(w.steps.length - 1, Math.max(0, Math.floor(v * w.steps.length)))));
  const bar = useTransform(p, [0, 1], [0, 1]);
  const num = (i: number) => f.number(i + 1).padStart(2, f.number(0));

  if (!seq) {
    return (
      <section ref={ref} id="how" aria-labelledby="how-title" className="scroll-mt-8 py-6">
        <Wrap>
          <div className="flex flex-col gap-10 rounded-[28px] bg-lime p-[clamp(1.75rem,5vw,4rem)] text-ink-deep">
            <h2 id="how-title" className="label-mono flex items-center gap-2">
              <Seat className="bg-ink-deep text-[14px]" /> {w.kicker}
            </h2>
            <ol className="flex flex-col gap-10">
              {w.steps.map((s, i) => (
                <li key={s.word} className="flex flex-col gap-3 border-t border-ink-deep/20 pt-6">
                  <span className="timecode text-sm">{num(i)}</span>
                  <h3 className="font-display text-[clamp(56px,16vw,140px)] font-extrabold leading-[0.85]">{s.word}</h3>
                  <p className="max-w-md text-lg text-ink-deep/80">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Wrap>
      </section>
    );
  }

  const step = w.steps[idx]!;
  return (
    <section ref={ref} id="how" aria-labelledby="how-title" className="relative h-[320vh] scroll-mt-0">
      <div className="sticky top-0 flex h-svh flex-col bg-lime text-ink-deep">
        <Wrap className="flex flex-1 flex-col justify-between gap-6 py-[clamp(2rem,5vw,4rem)]">
          <div className="flex items-center justify-between gap-6">
            <h2 id="how-title" className="label-mono flex items-center gap-2">
              <Seat className="bg-ink-deep text-[14px]" /> {w.kicker}
            </h2>
            <ol aria-hidden className="flex items-center gap-3">
              {w.steps.map((s, i) => (
                <li key={s.word} className={cn('timecode text-sm transition-opacity', i === idx ? 'opacity-100' : 'opacity-40')}>
                  {num(i)}
                </li>
              ))}
            </ol>
          </div>

          {/* Screen readers get the whole sequence at once. */}
          <ol className="sr-only">
            {w.steps.map((s) => (
              <li key={s.word}>
                <h3>{s.word}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <div aria-hidden className="relative flex min-h-[46vh] flex-col justify-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={step.word} className="flex flex-col gap-6">
                <span className="block overflow-hidden pb-[0.05em]">
                  <motion.span
                    className="block font-display text-[clamp(96px,19vw,300px)] font-extrabold leading-[0.82] tracking-[-0.04em]"
                    initial={{ y: '100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    {step.word}
                  </motion.span>
                </span>
                <motion.p
                  className="max-w-xl text-[clamp(18px,1.8vw,26px)] leading-snug"
                  initial={{ opacity: 0.35, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                >
                  {step.text}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div aria-hidden className="h-1 overflow-hidden rounded-full bg-ink-deep/15">
            <motion.div className="h-full origin-left bg-ink-deep rtl:origin-right" style={{ scaleX: bar }} />
          </div>
        </Wrap>
      </div>
    </section>
  );
}
