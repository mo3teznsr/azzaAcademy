'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { LANDING_IMAGES } from './content';
import { useCalm } from './hooks';
import { Kicker } from './seat';
import { useLargestRoom, useSpotlightBatch } from './use-landing-data';
import { Wrap } from './wrap';

/** 2 · Small classes: the spotlight class's real places light up one by one as it scrolls in. */
export function House() {
  const { t, f, fill } = useI18n();
  const h = t.landing.house;
  const batch = useSpotlightBatch();
  const largest = useLargestRoom();
  const calm = useCalm();
  const grid = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);

  const capacity = batch?.capacity ?? 16;
  const taken = Math.min(batch?._count.enrollments ?? 0, capacity);
  const { scrollYProgress } = useScroll({ target: grid, offset: ['start 90%', 'center 50%'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setLit(Math.round(Math.min(1, Math.max(0, v)) * taken)));
  const shown = calm ? taken : lit;
  const left = capacity - shown;
  const cols = capacity <= 12 ? 4 : capacity <= 16 ? 4 : 6;

  return (
    <section aria-labelledby="house-title" className="theme-ink bg-ink-deep py-[clamp(4rem,10vw,9rem)] text-foreground">
      <Wrap className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Kicker className="text-mint">{h.kicker}</Kicker>
          <h2 id="house-title" className="font-display text-[clamp(44px,6.4vw,104px)] font-extrabold leading-[0.88]">
            {h.titleA}
            <span className="block font-light text-mint">{h.titleB}</span>
          </h2>
          <p className="max-w-md text-lg text-soft-foreground">{h.body}</p>
          {batch ? (
            <dl className="mt-2 grid max-w-md grid-cols-2 gap-6 border-t border-border pt-6">
              <div>
                <dt className="label-mono text-muted-foreground">{h.leftLabel}</dt>
                <dd className="font-display text-[clamp(56px,7vw,96px)] font-extrabold leading-none tabular-nums" aria-live="off">
                  <span aria-hidden>{f.number(left)}</span>
                  <span className="sr-only">{f.number(capacity - taken)}</span>
                </dd>
              </div>
              <div>
                <dt className="label-mono text-muted-foreground">{h.roomLabel}</dt>
                <dd className="font-display text-[clamp(56px,7vw,96px)] font-extrabold leading-none text-mint">{f.number(capacity)}</dd>
              </div>
              {largest !== null && <p className="col-span-2 text-sm text-muted-foreground">{fill(h.upTo, { n: f.number(largest) })}</p>}
            </dl>
          ) : (
            <p className="text-muted-foreground">{h.fallback}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div
            ref={grid}
            role="img"
            aria-label={batch ? fill(h.gridLabel, { code: batch.code, taken: f.number(taken), cap: f.number(capacity) }) : h.fallback}
            className="rounded-[28px] border border-border bg-ink-2/60 p-[clamp(1.25rem,3vw,2.5rem)]"
          >
            {/* The stage: where the teacher stands, facing the house. */}
            <div aria-hidden className="mb-8 flex items-center gap-3">
              <span className="h-2 flex-1 rounded-full bg-mint/70" />
              <span className="label-mono text-muted-foreground">{h.stage}</span>
              <span className="h-2 flex-1 rounded-full bg-mint/70" />
            </div>
            <div aria-hidden className="mx-auto grid max-w-[520px] gap-[clamp(8px,1.4vw,16px)]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: capacity }, (_, i) => {
                const on = i < shown;
                return (
                  <span
                    key={i}
                    className={cn(
                      'aspect-square rounded-[22%] border-2 transition-[background-color,border-color,scale] duration-500 ease-(--ease-entrance)',
                      on ? 'scale-100 border-green bg-green' : 'scale-[0.86] border-line-2 bg-transparent',
                    )}
                  />
                );
              })}
            </div>
            {batch && (
              <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3 text-sm">
                <span className="label-mono text-muted-foreground" dir="ltr">
                  {batch.code} · {batch.schedule?.startTime}
                </span>
                <Link href={`/courses/${batch.course.slug}?batch=${batch.id}`} className="link-sun">
                  {fill(h.cta, { code: batch.code })}
                </Link>
              </div>
            )}
          </div>
          <div className="relative hidden aspect-[16/7] overflow-hidden rounded-[24px] md:block">
            <Image src={LANDING_IMAGES.gallery} alt={h.photoAlt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
