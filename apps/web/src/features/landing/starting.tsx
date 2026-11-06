'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/brand/states';
import { gmtOffset } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import { describeRule } from '@/lib/schedule';
import { useCalm } from './hooks';
import { MarqueeRow } from './marquee-row';
import { Kicker, Seat } from './seat';
import { useOpenBatches } from './use-landing-data';
import { Wrap } from './wrap';

/** 8 · Starting soon: real open batches on two velocity rows. Pausable; static for reduced motion. */
export function Starting() {
  const { t, f, fill, pick, dir } = useI18n();
  const s = t.landing.starting;
  const calm = useCalm();
  const batches = useOpenBatches();
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(false);
  const items = batches.open.slice(0, 12);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const paused = calm || held || hover;
  // Repeat short lists so one copy is always wider than the screen.
  const loop = items.length ? Array.from({ length: Math.ceil(6 / items.length) }, () => items).flat() : [];
  const sign = dir === 'rtl' ? -1 : 1;

  const seatsLeft = (b: (typeof items)[number]) => Math.max(0, b.capacity - (b._count?.enrollments ?? 0));
  const href = (b: (typeof items)[number]) => `/courses/${b.course.slug}?batch=${b.id}`;

  return (
    <section id="starting" aria-labelledby="starting-title" className="theme-ink scroll-mt-8 overflow-hidden bg-ink py-[clamp(4rem,9vw,7rem)] text-foreground">
      <Wrap className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-5">
          <Kicker seat="pulse" className="text-mint">
            {s.kicker}
          </Kicker>
          <h2 id="starting-title" className="font-display text-[clamp(48px,7vw,112px)] font-extrabold leading-[0.86]">
            {s.title}
          </h2>
          <span className="label-mono text-muted-foreground">{fill(t.catalog.timesShown, { tz: gmtOffset(tz) })}</span>
        </div>
        {items.length > 0 && !calm && (
          <button
            type="button"
            aria-pressed={held}
            onClick={() => setHeld((v) => !v)}
            className="press flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm text-muted-foreground hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {held ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            {t.landing.pauseScrolling}
          </button>
        )}
      </Wrap>

      <div className="mt-12">
        {batches.isPending ? (
          <Wrap>
            <LoadingBlock rows={2} height={96} />
          </Wrap>
        ) : batches.isError ? (
          <Wrap>
            <ErrorState error={batches.error} onRetry={() => void batches.refetch()} />
          </Wrap>
        ) : items.length === 0 ? (
          <Wrap>
            <EmptyState title={t.catalog.noStarting} />
          </Wrap>
        ) : calm ? (
          <Wrap>
            <ul className="flex flex-col">
              {items.map((b) => (
                <li key={b.id} className="border-t border-border">
                  <Link href={href(b)} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-5 text-foreground no-underline hover:text-mint">
                    <b className="font-display text-4xl font-extrabold" dir="ltr">
                      {b.code}
                    </b>
                    <span className="font-display text-2xl">{pick(b.course.titleEn, b.course.titleAr).text}</span>
                    <span className="text-sm text-muted-foreground">
                      {fill(t.landing.starts, { d: f.dayMonth(b.startsOn, b.timezone) })} · {describeRule(b, f)} · {f.plural(seatsLeft(b), s.seatsLeft)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Wrap>
        ) : (
          <div className="flex flex-col gap-3" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
            <MarqueeRow list={t.landing.marqueeLabel} base={-2.4 * sign} paused={paused} className="font-display text-[clamp(44px,8vw,128px)] font-extrabold leading-[1.05]">
                {(copy) =>
                  loop.map((b, k) => (
                    <li key={`${b.id}-${k}`} className="flex items-center" aria-hidden={copy || k >= items.length || undefined}>
                      <Link
                        href={href(b)}
                        tabIndex={copy || k >= items.length ? -1 : undefined}
                        aria-label={`${b.code} · ${pick(b.course.titleEn, b.course.titleAr).text} · ${fill(t.landing.starts, { d: f.dayMonth(b.startsOn, b.timezone) })}`}
                        className="flex items-center gap-[0.3em] px-[0.35em] text-foreground no-underline hover:text-mint"
                      >
                        <span dir="ltr" className="text-mint">
                          {b.code}
                        </span>
                        <span>{pick(b.course.titleEn, b.course.titleAr).text}</span>
                      </Link>
                      <Seat className="mx-[0.3em] text-[0.4em]" />
                    </li>
                  ))
                }
            </MarqueeRow>
            <div aria-hidden>
              <MarqueeRow base={1.6 * sign} paused={paused} className="label-mono text-[clamp(13px,1.3vw,18px)] text-muted-foreground">
                {() =>
                  loop.map((b, k) => (
                    <span key={`${b.id}-${k}`} className="flex items-center gap-3 px-6">
                      <span dir="ltr" className="text-cream">
                        {b.code}
                      </span>
                      <span>{fill(t.landing.starts, { d: f.dayMonth(b.startsOn, b.timezone) })}</span>
                      <span>{describeRule(b, f)}</span>
                      <span className="text-mint">{f.plural(seatsLeft(b), s.seatsLeft)}</span>
                      <Seat state="empty" className="ms-3 text-[12px]" />
                    </span>
                  ))
                }
              </MarqueeRow>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
