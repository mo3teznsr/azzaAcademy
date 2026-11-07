'use client';

import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';
import { useLiveNow } from '../catalog/use-catalog';
import { Kicker, Seat } from './seat';
import { LANDING_IMAGES } from './content';
import { useSpotlightBatch } from './use-landing-data';
import { Wrap } from './wrap';

const FROM = ['below', 'start', 'above'] as const;

/** 1 · "Learn it. Practise it. Make it yours." Mask lines from three sides, the photo window, the live-now seat. */
export function Hero() {
  const { t, f, fill } = useI18n();
  const live = useLiveNow();
  const next = useSpotlightBatch();
  const onAir = (live.data?.liveSessions ?? 0) > 0;
  const h = t.landing.hero;

  return (
    <Wrap as="section" aria-labelledby="hero-title" className="flex flex-col gap-8 pt-4 md:pt-8">
      {onAir && <OnAirStrip />}
      <Kicker className="text-muted-foreground">{h.kicker}</Kicker>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="flex flex-col justify-between gap-10">
          <h1 id="hero-title" aria-label={h.title} className="font-display text-[clamp(48px,8.4vw,132px)] font-extrabold leading-[0.86] tracking-[-0.035em]">
            {h.lines.map((line, i) => (
              <span key={line} aria-hidden className="landing-mask">
                <span
                  className={i === 1 ? 'landing-line font-light text-sun-fg' : 'landing-line'}
                  data-from={FROM[i % FROM.length]}
                  style={{ '--step': i } as CSSProperties}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <div className="site-entrance flex flex-col gap-6" style={{ '--entrance-step': 4 } as CSSProperties}>
            <p className="max-w-lg text-lg leading-relaxed text-soft-foreground">{h.body}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#catalog">
                  {h.primary} <ArrowDown />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">{h.secondary}</a>
              </Button>
            </div>
          </div>
        </div>

        {/* The live-room window: the photo stays clean; the slate sits on the frame below it. */}
        <figure className="flex flex-col gap-3">
          <div className="landing-window relative aspect-[4/3] overflow-hidden rounded-[24px] bg-muted shadow-media sm:aspect-[16/10] lg:aspect-[4/5]">
            <Image src={LANDING_IMAGES.onAir} alt={h.photoAlt} fill preload sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover object-[50%_35%]" />
          </div>
          <figcaption className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="label-mono flex items-center gap-2 text-foreground" role="status">
              <Seat state={onAir ? 'onair' : 'pulse'} className="text-[14px]" />
              {onAir ? t.landing.onAirNow : next ? fill(h.nextDoors, { code: next.code, when: `${f.date(next.startsOn, next.timezone)} · ${f.time(next.startsOn, next.timezone)}` }) : h.offAir}
            </span>
          </figcaption>
        </figure>
      </div>
    </Wrap>
  );
}

/** Public "live now" strip — only while a session is live. */
function OnAirStrip() {
  const { t, f, fill } = useI18n();
  const live = useLiveNow();
  const n = live.data?.liveSessions ?? 0;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 self-start rounded-full bg-onair px-5 py-2.5 text-onair-ink">
      <span className="label-mono flex items-center gap-2 font-semibold">
        <span aria-hidden className="onair" /> {t.landing.onAirNow}
      </span>
      <b className="font-display text-lg">{f.plural(n, t.landing.onAirSessions)}</b>
      <span className="text-sm">{fill(t.landing.onAirLearners, { n: f.number(live.data?.participants ?? 0) })}</span>
    </div>
  );
}
