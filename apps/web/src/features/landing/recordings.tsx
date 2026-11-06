'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useAuth } from '@/lib/auth/use-auth';
import { sessionCode } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { LANDING_IMAGES } from './content';
import { useCalm } from './hooks';
import { Kicker, Seat } from './seat';
import { useSpotlightBatch } from './use-landing-data';
import { Wrap } from './wrap';

const W = 1200;
const H = 170;

/** 6 · Miss one? It waits. The batch's sessions as a drawn line; the ones that ended light up as kept recordings. */
export function Recordings() {
  const { t, f, fill } = useI18n();
  const r = t.landing.recordings;
  const { user } = useAuth();
  const batch = useSpotlightBatch();
  const calm = useCalm();
  const n = Math.min(12, Math.max(6, batch?.schedule?.sessionCount ?? 12));
  // Illustrative mid-batch moment: two thirds of the sessions have run.
  const ended = Math.round(n * 0.66);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(p, 'change', setProgress);
  const drawn = calm ? 1 : progress;
  const litCount = calm ? ended : Math.min(ended, Math.floor(drawn * (n + 0.5)));

  const points = Array.from({ length: n }, (_, i) => ({ x: 50 + (i * (W - 100)) / (n - 1), y: H / 2 + Math.sin(i * 0.95) * 38 }));
  const d = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1]!;
    const mx = (prev.x + pt.x) / 2;
    return `${acc} C ${mx} ${prev.y}, ${mx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  return (
    <section aria-labelledby="rec-title" className="py-[clamp(4rem,10vw,8rem)]">
      <Wrap className="flex flex-col gap-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div className="flex flex-col gap-6">
            <Kicker className="text-muted-foreground">{r.kicker}</Kicker>
            <h2 id="rec-title" className="font-display text-[clamp(52px,8vw,128px)] font-extrabold leading-[0.85]">
              {r.titleA}
              <span className="block font-light text-sun-fg">{r.titleB}</span>
            </h2>
            <p className="max-w-md text-lg text-soft-foreground">{r.body}</p>
            <Link href={user ? '/library' : '/sign-in?next=/library'} className="link-sun self-start">
              {r.link}
            </Link>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-[24px] bg-muted shadow-media">
            <Image src={LANDING_IMAGES.evening} alt={r.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>

        <div ref={ref}>
          <p className="sr-only">{fill(r.label, { last: sessionCode(n), ended: f.number(ended) })}</p>

          {/* Wide: one drawn line through every session. */}
          <div aria-hidden className="relative hidden md:block">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible rtl:-scale-x-100" fill="none">
              <path d={d} stroke="var(--border)" strokeWidth={2} strokeDasharray="4 8" />
              <motion.path d={d} stroke="var(--green)" strokeWidth={4} strokeLinecap="round" style={{ pathLength: drawn }} />
            </svg>
            {points.map((pt, i) => (
              <Node key={i} i={i} lit={i < litCount} ended={i < ended} style={{ insetInlineStart: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }} />
            ))}
          </div>

          {/* Narrow: two rows of seats. */}
          <ol aria-hidden className="grid grid-cols-6 gap-x-2 gap-y-6 md:hidden">
            {points.map((_, i) => (
              <li key={i} className="flex flex-col items-center gap-1.5">
                <span className={cn('size-8 rounded-[8px] border-2 transition-colors duration-500', i < litCount ? 'border-green bg-green' : 'border-line-strong')} />
                <span className="timecode text-[11px] text-muted-foreground">{sessionCode(i + 1)}</span>
              </li>
            ))}
          </ol>

          <div aria-hidden className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Seat className="text-[13px]" /> {r.ended}
            </span>
            <span className="flex items-center gap-2">
              <Seat state="empty" className="text-[13px]" /> {r.upcoming}
            </span>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

function Node({ i, lit, ended, style }: { i: number; lit: boolean; ended: boolean; style: React.CSSProperties }) {
  return (
    <span className="absolute flex -translate-y-1/2 flex-col items-center gap-2 ltr:-translate-x-1/2 rtl:translate-x-1/2" style={style}>
      <span
        className={cn(
          'grid size-9 place-items-center rounded-[10px] border-2 bg-background transition-[background-color,border-color,scale] duration-500 ease-(--ease-entrance)',
          lit ? 'scale-100 border-green bg-green text-ink-deep' : ended ? 'scale-90 border-line-strong' : 'scale-90 border-dashed border-line-strong',
        )}
      >
        <span className="timecode text-[10px] font-bold">{sessionCode(i + 1)}</span>
      </span>
    </span>
  );
}
