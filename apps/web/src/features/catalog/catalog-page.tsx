'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Pause, Play, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Accordion } from './faq';
import { CourseCover } from '@/components/brand/course-cover';
import { SignalMark } from '@/components/brand/signal-mark';
import { BatchStatusChip } from '@/components/brand/status-chip';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/brand/states';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { batchPriceFils, describeRule } from '@/lib/schedule';
import { useAuth } from '@/lib/auth/use-auth';
import { gmtOffset } from '@/lib/i18n/format';
import type { BatchSummary, Course } from '@/lib/api/types';
import { useCatalogCourses, useLiveNow, usePublicBatches } from './use-catalog';

export function CatalogPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-24 px-4 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4">
        <OnAirStrip />
        <Hero />
        <StartMarquee />
      </div>
      <HowItWorks />
      <Catalog />
      <StartingSoon />
      <Pricing />
      <Faq />
      <FinalCta />
      <span className="sr-only">{t.meta.description}</span>
    </div>
  );
}

function Hero() {
  const { t, f, fill } = useI18n();
  const live = useLiveNow();
  const n = live.data?.liveSessions ?? 0;
  return (
    <section className="mt-6 flex flex-col gap-8">
      <div>
        <div className="label-mono mb-4 flex flex-wrap items-center gap-2 text-onair-fg">
          <SignalMark size={18} /> {t.nav.public.findBatch}
          {n > 0 && (
            <span className="ms-2 inline-flex items-center gap-1.5 rounded-full bg-onair px-2.5 py-0.5 text-ink" role="status">
              <span aria-hidden className="onair" /> {fill(t.catalog.liveNow, { n: f.number(n), p: f.number(live.data?.participants ?? 0) })}
            </span>
          )}
        </div>
        <h1 className="font-display text-[clamp(64px,11vw,180px)] font-extrabold leading-[0.82]">
          <RiseWords lines={[[{ text: t.catalog.titleA }], [{ text: t.catalog.titleB, className: 'font-light' }, { text: t.catalog.titleC }]]} />
        </h1>
      </div>
      {/* The photo stands on its own — no scrim, no type on it; the copy sits beside it. */}
      <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] bg-muted lg:aspect-[16/9]">
          <Image src="/images/scenes/hero.jpg" alt="" fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-[70%_center]" />
        </div>
        <div className="flex flex-col gap-6 pb-2">
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">{t.catalog.body}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#catalog">
                {t.catalog.browse} <ArrowDown />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#starting">{t.catalog.seeMonth}</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t, f } = useI18n();
  return (
    <section id="how" aria-labelledby="how-title" className="flex flex-col gap-6">
      <h2 id="how-title" className="label-mono text-muted-foreground">
        {t.catalog.howTitle}
      </h2>
      <ol className="grid gap-px overflow-hidden rounded-[20px] border border-border bg-border md:grid-cols-3">
        {t.catalog.steps.map((s, i) => (
          <li key={s.word} className="flex flex-col gap-3 bg-background p-7">
            <span className="timecode text-sm text-muted-foreground">{f.number(i + 1).padStart(2, f.number(0))}</span>
            <b className="font-display text-5xl font-extrabold">{s.word}</b>
            <span className="text-muted-foreground">{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Catalog() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const deferredQ = useDeferredValue(q);
  const courses = useCatalogCourses({ q: deferredQ || undefined });
  const batches = usePublicBatches();

  const categories = useMemo(() => {
    const set = new Set((courses.data?.items ?? []).map((c) => c.category));
    return [...set].sort();
  }, [courses.data]);
  const items = (courses.data?.items ?? []).filter((c) => !category || c.category === category);

  return (
    <section id="catalog" aria-labelledby="catalog-title" className="flex scroll-mt-8 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="catalog-title" className="font-display text-[clamp(44px,6vw,72px)] font-extrabold leading-[0.9]">
          {t.catalog.catalogTitle}
        </h2>
        <label className="flex h-12 w-full max-w-sm items-center gap-2.5 rounded-full border border-border bg-card px-4 text-muted-foreground">
          <Search className="size-5" />
          <span className="sr-only">{t.catalog.searchPlaceholder}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      {categories.length > 1 && (
        <ToggleGroup type="single" value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' || !v ? '' : v)} className="flex flex-wrap justify-start gap-2">
          {['all', ...categories].map((c) => (
            <ToggleGroupItem key={c} value={c} className="h-9 rounded-full border border-border px-4 text-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {c === 'all' ? t.catalog.allCategories : c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {courses.isPending ? (
        <LoadingGrid count={6} height={380} />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t.catalog.emptyTitle}
          body={t.catalog.emptyBody}
          action={q || category ? { label: t.catalog.clearFilters, onClick: () => (setQ(''), setCategory('')) } : undefined}
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
          {items.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} batches={batches.byCourse.get(c.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CourseCard({ course, batches }: { course: Course; batches: BatchSummary[] }) {
  const { t, f, pick } = useI18n();
  const money = useMoney();
  const title = pick(course.titleEn, course.titleAr);
  const next = batches.find((b) => b.status === 'ENROLLING') ?? batches[0];
  const minPrice = batches.length ? Math.min(...batches.map(batchPriceFils)) : course.priceFils;
  return (
    <Link href={`/courses/${course.slug}`} className="group flex h-full flex-col gap-4 rounded-[20px] bg-card p-3 no-underline transition-transform duration-300 ease-(--ease-expo) hover:-translate-y-1">
      <CourseCover course={course} showMeta={false} className="h-56" />
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label-mono truncate text-muted-foreground">{course.category}</span>
          <span className="label-mono shrink-0 rounded-full border border-border px-2.5 py-1 text-muted-foreground">{f.plural(batches.length, t.catalog.batches)}</span>
        </div>
        <b className="text-lg leading-tight text-foreground">{title.text}</b>
        {title.fallback && <span className="label-mono text-muted-foreground">{t.common.englishOnly}</span>}
        <span className="text-sm text-muted-foreground">
          {t.status.level[course.level]} · {f.plural(course.modules.length || (next?.schedule?.sessionCount ?? 0), t.common.sessions)}
        </span>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            <span className="label-mono block">{t.catalog.nextBatch}</span>
            <span className="text-foreground">{next ? `${next.code} · ${f.dayMonth(next.startsOn, next.timezone)}` : t.catalog.noUpcoming}</span>
          </span>
          <span className="text-end text-muted-foreground">
            {t.catalog.from} <b className="block text-base text-foreground">{money.display(minPrice)}</b>
          </span>
        </div>
      </div>
    </Link>
  );
}

function StartingSoon() {
  const { t, f, fill, pick } = useI18n();
  const batches = usePublicBatches();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const items = (batches.data?.items ?? []).filter((b) => b.status === 'ENROLLING').slice(0, 8);
  return (
    <section id="starting" aria-labelledby="starting-title" className="flex scroll-mt-8 flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="starting-title" className="font-display text-[40px] font-extrabold leading-none">
          {t.catalog.startingTitle}
        </h2>
        <span className="label-mono text-muted-foreground">{fill(t.catalog.timesShown, { tz: gmtOffset(tz) })}</span>
      </div>
      {batches.isPending ? (
        <LoadingGrid count={4} height={180} />
      ) : batches.isError ? (
        <ErrorState error={batches.error} onRetry={() => void batches.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t.catalog.noStarting} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
          {items.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <b className="font-display text-3xl font-extrabold" dir="ltr">
                  {b.code}
                </b>
                <BatchStatusChip status={b.status} taken={b._count?.enrollments} capacity={b.capacity} />
              </div>
              <b>{pick(b.course.titleEn, b.course.titleAr).text}</b>
              <span className="font-display text-lg">{describeRule(b, f)}</span>
              <span className="text-sm text-muted-foreground">
                {f.dayMonth(b.startsOn, b.timezone)} → {f.dayMonth(b.endsOn, b.timezone)} · {t.status.sessionLanguage[b.language]}
              </span>
              <Link href={`/courses/${b.course.slug}?batch=${b.id}`} className="link-sun mt-auto text-sm">
                {t.catalog.viewBatch}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="faq-title" className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      <h2 id="faq-title" className="font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.85]">
        {t.catalog.faqA}
        <br />
        <span className="font-light">{t.catalog.faqB}</span>
      </h2>
      <Accordion items={t.catalog.faq} />
    </section>
  );
}

/** Splits each line into words that rise in one after another (reduced motion: static). */
function RiseWords({ lines }: { lines: Array<Array<{ text: string; className?: string }>> }) {
  let i = 0;
  return (
    <>
      {lines.map((parts, li) => (
        <span key={li} className="block">
          {parts.flatMap((part, pi) => {
            const words = part.text.split(/\s+/).filter(Boolean);
            return words.map((w, wi) => {
              const n = i++;
              const node: ReactNode = (
                <span key={`${pi}-${wi}`} className={`rise inline-block ${part.className ?? ''}`} style={{ '--i': n } as CSSProperties}>
                  {w}
                </span>
              );
              return wi === words.length - 1 && pi === parts.length - 1 ? [node] : [node, ' '];
            });
          })}
        </span>
      ))}
    </>
  );
}

/** Public "on air now" strip — hidden when nothing is live. */
function OnAirStrip() {
  const { t, f, fill } = useI18n();
  const live = useLiveNow();
  const n = live.data?.liveSessions ?? 0;
  if (n <= 0) return null;
  return (
    <section aria-label={t.landing.onAirNow} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full bg-onair px-5 py-2.5 text-ink" role="status">
      <span className="label-mono flex items-center gap-2 font-semibold">
        <span aria-hidden className="onair" /> {t.landing.onAirNow}
      </span>
      <b className="font-display text-lg">{f.plural(n, t.landing.onAirSessions)}</b>
      <span className="text-sm">{fill(t.landing.onAirLearners, { n: f.number(live.data?.participants ?? 0) })}</span>
    </section>
  );
}

/** Upcoming batch start dates, scrolling. A real toggle pauses it; hover/focus also holds it. */
function StartMarquee() {
  const { t, f, fill, pick } = useI18n();
  const batches = usePublicBatches();
  const [paused, setPaused] = useState(false);
  const items = useMemo(
    () => [...(batches.data?.items ?? [])].filter((b) => b.status === 'ENROLLING').sort((a, b) => a.startsOn.localeCompare(b.startsOn)).slice(0, 12),
    [batches.data],
  );
  if (items.length === 0) return null;
  return (
    <section aria-label={t.landing.marqueeLabel} className="marquee flex items-center gap-3 border-y border-border py-2.5" data-paused={paused}>
      <button
        type="button"
        aria-pressed={paused}
        aria-label={t.landing.pauseScrolling}
        onClick={() => setPaused((p) => !p)}
        className="press grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
      >
        {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <ul className="marquee-track flex w-max items-center">
          {[...items, ...items].map((b, k) => {
            const dup = k >= items.length;
            return (
              <li key={`${b.id}-${k}`} aria-hidden={dup || undefined} className={dup ? 'motion-reduce:hidden' : undefined}>
                <Link
                  href={`/courses/${b.course.slug}?batch=${b.id}`}
                  tabIndex={dup ? -1 : undefined}
                  className="flex min-h-11 items-center gap-3 px-5 text-sm whitespace-nowrap text-muted-foreground no-underline hover:text-foreground"
                >
                  <b className="font-display text-lg text-foreground" dir="ltr">
                    {b.code}
                  </b>
                  <span>{pick(b.course.titleEn, b.course.titleAr).text}</span>
                  <span className="label-mono text-sun-fg">{fill(t.landing.starts, { d: f.dayMonth(b.startsOn, b.timezone) })}</span>
                  <span aria-hidden className="text-line-strong">
                    /
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Pricing() {
  const { t, fill } = useI18n();
  const money = useMoney();
  const batches = usePublicBatches();
  const open = (batches.data?.items ?? []).filter((b) => b.status === 'ENROLLING');
  const min = open.length ? Math.min(...open.map(batchPriceFils)) : null;
  const price = (fils: number | null) => (fils === null ? '—' : money.aed(fils));
  const plans = [
    { key: 'full', plan: t.landing.plans.full, amount: fill(t.landing.plans.full.price, { p: price(min) }), featured: true },
    { key: 'bank', plan: t.landing.plans.bank, amount: fill(t.landing.plans.bank.price, { p: price(min) }), featured: false },
  ];
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="flex scroll-mt-8 flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <span className="label-mono text-muted-foreground">{t.landing.pricingKicker}</span>
          <h2 id="pricing-title" className="mt-3 font-display text-[clamp(48px,7vw,96px)] font-extrabold leading-[0.85]">
            {t.landing.pricingTitleA}
            <br />
            <span className="font-light">{t.landing.pricingTitleB}</span>
          </h2>
        </div>
        <p className="max-w-md text-muted-foreground">
          {t.landing.pricingBody} {min !== null && <span className="block pt-2 text-sm">{t.landing.pricingFrom}</span>}
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {plans.map(({ key, plan, amount, featured }) => (
          <li key={key} className={featured ? 'flex flex-col gap-4 rounded-[24px] bg-ivory p-6 text-ink light:bg-ink light:text-ivory' : 'flex flex-col gap-4 rounded-[24px] border border-border p-6'}>
            <span className={featured ? 'label-mono text-stone-2 light:text-stone' : 'label-mono text-muted-foreground'}>{plan.name}</span>
            <b className="font-display text-4xl font-extrabold leading-none">{amount}</b>
            <p className={featured ? 'text-sm text-stone-2 light:text-stone' : 'text-sm text-muted-foreground'}>{plan.note}</p>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="self-start">
        <a href="#catalog">
          {t.landing.pricingCta} <ArrowRight className="rtl:rotate-180" />
        </a>
      </Button>
    </section>
  );
}

function FinalCta() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <section aria-labelledby="final-title" className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
      <div className="flex flex-col gap-8">
        <h2 id="final-title" className="font-display text-[clamp(56px,8vw,128px)] font-extrabold leading-[0.82]">
          <span className="block">{t.landing.finalTitleA}</span>
          <span className="block font-light">{t.landing.finalTitleB}</span>
        </h2>
        <p className="max-w-md text-lg text-soft-foreground">{t.landing.finalBody}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="sun">
            <a href="#catalog">{t.landing.finalPrimary}</a>
          </Button>
          {!user && (
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-up">{t.landing.finalSecondary}</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-muted">
        <Image src="/images/scenes/onboarding.jpg" alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}
