'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import { gmtOffset } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import { addMinutesHHMM } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { useSequence } from './hooks';
import { Kicker, Seat } from './seat';
import { useSpotlightBatch } from './use-landing-data';
import { Wrap } from './wrap';

/** Mon → Sun columns (0 = Sunday, as in ScheduleRule.weekdays). */
const DAYS = [1, 2, 3, 4, 5, 6, 0];

/** 3 · Your week: a sticky weekly calendar; the batch's sessions slot in, then the time-zone line turns to yours. */
export function Week() {
  const { t, f, fill } = useI18n();
  const w = t.landing.week;
  const batch = useSpotlightBatch();
  const seq = useSequence();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [yours, setYours] = useState(false);
  useMotionValueEvent(p, 'change', (v) => setYours(v > 0.62));

  const rule = batch?.schedule;
  const start = rule?.startTime ?? '19:00';
  const startHour = Number(start.slice(0, 2));
  const hours = [startHour - 2, startHour - 1, startHour, startHour + 1, startHour + 2].filter((h) => h >= 0 && h < 24);
  const days = rule?.weekdays ?? [];
  const batchTz = batch?.timezone ?? 'Asia/Dubai';
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const tzBatch = batch ? fill(w.tzBatch, { time: f.time(batch.startsOn, batchTz), tz: batchTz.replace(/_/g, ' '), off: gmtOffset(batchTz) }) : null;
  const tzYours = batch ? fill(w.tzYours, { time: f.time(batch.startsOn), off: gmtOffset(myTz) }) : null;
  const ruleText = rule
    ? fill(w.rule, {
        days: [...days].sort((a, b) => a - b).map((d) => f.weekdayName(d)).join(w.joiner),
        time: `${rule.startTime}–${addMinutesHHMM(rule.startTime, rule.durationMin)}`,
        n: f.plural(rule.sessionCount, t.common.sessions),
      })
    : w.fallbackRule;

  const copy = (
    <div className="flex flex-col gap-6">
      <Kicker className="text-muted-foreground">{w.kicker}</Kicker>
      <h2 id="week-title" className="font-display text-[clamp(44px,6vw,96px)] font-extrabold leading-[0.88]">
        {w.titleA}
        <span className="block font-light">{w.titleB}</span>
      </h2>
      <p className="max-w-md text-lg text-soft-foreground">{w.body}</p>
      <p className="font-display text-2xl font-bold">{ruleText}</p>
      {batch && (
        <p className="label-mono flex items-center gap-2 text-muted-foreground" aria-live="polite">
          <Seat state="pulse" className="text-[13px]" />
          {seq ? (yours ? tzYours : tzBatch) : tzYours}
        </p>
      )}
      {batch && !seq && <p className="label-mono text-muted-foreground">{tzBatch}</p>}
    </div>
  );

  const calendar = (
    <div
      role="img"
      aria-label={batch ? fill(w.calendarLabel, { code: batch.code, rule: ruleText }) : ruleText}
      className="rounded-[24px] border border-border bg-card p-3 shadow-card sm:p-5"
    >
      <div aria-hidden className="grid grid-cols-[2.6rem_repeat(7,minmax(0,1fr))] gap-1 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] sm:gap-1.5">
        <span />
        {DAYS.map((d) => (
          <span key={d} className={cn('label-mono pb-2 text-center', days.includes(d) ? 'text-foreground' : 'text-muted-foreground')}>
            {f.weekdayName(d)}
          </span>
        ))}
        {hours.map((h) => (
          <Row key={h} hour={h} days={days} isStart={h === startHour} code={batch?.code ?? ''} p={p} seq={seq} />
        ))}
      </div>
    </div>
  );

  if (!seq) {
    return (
      <section ref={ref} aria-labelledby="week-title" className="relative py-[clamp(4rem,10vw,8rem)]">
        <Wrap className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          {copy}
          {calendar}
        </Wrap>
      </section>
    );
  }
  return (
    <section ref={ref} aria-labelledby="week-title" className="relative h-[230vh]">
      <div className="sticky top-0 flex h-svh items-center">
        <Wrap className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          {copy}
          {calendar}
        </Wrap>
      </div>
    </section>
  );
}

function Row({ hour, days, isStart, code, p, seq }: { hour: number; days: number[]; isStart: boolean; code: string; p: MotionValue<number>; seq: boolean }) {
  const order = DAYS.filter((d) => days.includes(d));
  return (
    <>
      <span className="timecode pt-2 text-end text-[11px] text-muted-foreground sm:pe-2">{`${String(hour).padStart(2, '0')}:00`}</span>
      {DAYS.map((d) => (
        <span key={d} className="relative h-12 rounded-[10px] border border-dashed border-border sm:h-14">
          {isStart && days.includes(d) && <Block index={order.indexOf(d)} total={order.length} code={code} p={p} seq={seq} />}
        </span>
      ))}
    </>
  );
}

/** A session dropping into its slot; reduced motion / mobile: already in place. */
function Block({ index, total, code, p, seq }: { index: number; total: number; code: string; p: MotionValue<number>; seq: boolean }) {
  const a = 0.08 + (index / Math.max(1, total)) * 0.4;
  const y = useTransform(p, [a, a + 0.14], [-56, 0]);
  const opacity = useTransform(p, [a, a + 0.1], [0.35, 1]);
  const scale = useTransform(p, [a, a + 0.14], [0.8, 1]);
  return (
    <motion.span
      style={seq ? { y, opacity, scale } : undefined}
      className="absolute inset-0.5 flex flex-col justify-between rounded-[8px] bg-green p-1.5 text-ink-deep"
    >
      <Seat state="lit" className="hidden bg-ink-deep text-[10px] sm:inline-block" />
      <span className="timecode truncate text-[10px] font-bold sm:text-[11px]">{code}</span>
    </motion.span>
  );
}
