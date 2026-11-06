'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { InitialsAvatar } from '@/components/brand/initials-avatar';
import { LoadingBlock } from '@/components/brand/states';
import { mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { EASE, useCalm, useFinePointer } from './hooks';
import { Kicker } from './seat';
import { useLandingTeachers, type LandingTeacher } from './use-landing-data';
import { Wrap } from './wrap';

/** 9 · The cast: the real teachers of open batches. The portrait follows the cursor; tap a name to expand on touch. */
export function Teachers() {
  const { t } = useI18n();
  const c = t.landing.teachers;
  const { teachers, isPending } = useLandingTeachers();
  const fine = useFinePointer();
  const calm = useCalm();
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 22 });
  const sy = useSpring(y, { stiffness: 180, damping: 22 });
  const follow = fine && !calm;
  const active = hovered !== null ? teachers[hovered] : null;

  if (!isPending && teachers.length === 0) return null;

  return (
    <section
      aria-labelledby="cast-title"
      className="py-[clamp(4rem,10vw,8rem)]"
      onPointerMove={(e) => {
        x.set(e.clientX);
        y.set(e.clientY);
      }}
    >
      <Wrap className="flex flex-col gap-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div className="flex flex-col gap-5">
            <Kicker className="text-muted-foreground">{c.kicker}</Kicker>
            <h2 id="cast-title" className="font-display text-[clamp(48px,7vw,112px)] font-extrabold leading-[0.86]">
              {c.titleA}
              <span className="block font-light">{c.titleB}</span>
            </h2>
          </div>
          <div className="flex max-w-md flex-col gap-4 lg:justify-self-end">
            <p className="text-lg text-soft-foreground">{c.body}</p>
            <Link href="/teachers" className="link-sun flex items-center gap-1 self-start font-bold">
              {c.seeAll} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </div>

        {isPending ? (
          <LoadingBlock rows={4} height={88} />
        ) : (
          <ul className="border-b border-border" onPointerLeave={() => setHovered(null)}>
            {teachers.map((teacher, i) => (
              <Row
                key={teacher.id}
                teacher={teacher}
                i={i}
                hovered={hovered === i}
                open={open === i}
                onHover={() => fine && setHovered(i)}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            ))}
          </ul>
        )}
      </Wrap>

      {/* Cursor-following portrait (mouse only, not for reduced motion). Decorative: the name is in the row. */}
      {follow && (
        <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-30 w-[min(22vw,300px)] -translate-x-1/2 -translate-y-1/2" style={{ x: sx, y: sy }}>
          <AnimatePresence mode="popLayout">
            {active && mediaUrl(active.image) && (
              <motion.div
                key={active.id}
                className="relative aspect-[4/5] overflow-hidden rounded-[24px] shadow-media"
                initial={{ opacity: 0.35, scale: 0.7, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85, rotate: 4 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <Image src={mediaUrl(active.image)!} alt="" fill sizes="300px" className="object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}

function Row({ teacher, i, hovered, open, onHover, onToggle }: { teacher: LandingTeacher; i: number; hovered: boolean; open: boolean; onHover: () => void; onToggle: () => void }) {
  const { t, f, pick } = useI18n();
  const c = t.landing.teachers;
  const id = useId();
  const subject = teacher.headline || teacher.courses.map((co) => pick(co.titleEn, co.titleAr).text).join(' · ');
  const langs = teacher.languages.map((l) => t.status.sessionLanguage[l]).join(' · ');
  return (
    <li className="border-t border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onPointerEnter={onHover}
        onClick={onToggle}
        className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 text-start md:grid-cols-[4rem_1.3fr_1fr_auto] md:py-8"
      >
        <span className="timecode text-sm text-muted-foreground">{f.number(i + 1).padStart(2, f.number(0))}</span>
        <span
          className={cn(
            'font-display text-[clamp(32px,5vw,76px)] font-extrabold leading-[0.95] transition-[translate,color] duration-500 ease-(--ease-entrance)',
            hovered && 'translate-x-4 text-sun-fg rtl:-translate-x-4',
          )}
        >
          {teacher.name}
        </span>
        <span className="hidden flex-col gap-1 text-sm text-muted-foreground md:flex">
          <span className="line-clamp-1 text-foreground">{subject}</span>
          <span className="label-mono">{langs}</span>
        </span>
        <Plus aria-hidden className={cn('size-6 transition-transform duration-300', open && 'rotate-45')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            aria-label={teacher.name}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 pb-8 ps-[2.5rem] sm:flex-row sm:items-start md:ps-[4rem]">
              <InitialsAvatar name={teacher.name} src={teacher.image} size={120} className="rounded-[24px]" />
              <div className="flex flex-col gap-2">
                <p className="text-lg">{subject}</p>
                <p className="label-mono text-muted-foreground">{c.languages} {langs}</p>
                <Link href={`/teachers/${teacher.id}`} className="link-sun flex items-center gap-1 self-start">
                  {c.profile} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
