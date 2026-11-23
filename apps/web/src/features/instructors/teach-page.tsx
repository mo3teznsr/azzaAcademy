'use client';

import Image from 'next/image';
import { ExplainerVideo } from '@/components/brand/explainer-video';
import Link from 'next/link';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Apple,
  ArrowLeft,
  Award,
  BarChart3,
  Check,
  ClipboardCheck,
  ListChecks,
  MessagesSquare,
  PlayCircle,
  Radio,
  Video,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingBlock } from '@/components/brand/states';
import { instructorsApi, siteApi, type TeachingTerms } from '@/lib/api';
import { useAuth } from '@/lib/auth/use-auth';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { ApplicationForm } from './application-form';

const TOOL_ICONS: LucideIcon[] = [Video, ListChecks, ClipboardCheck, MessagesSquare, Award, BarChart3];
const PROPOSE = '/studio/courses/new';
const STUDIO = '/studio';
const SECTION = 'border-t border-border py-[clamp(3rem,7vw,5.5rem)]';

/**
 * `/teach`: everything a prospective teacher needs (why Azza, formats, tools, fees, payouts, FAQ) plus instant teacher
 * sign-up. `initialTerms` comes from the server render (admin settings, never cached), so the numbers are in the HTML.
 */
export function TeachPage({ initialTerms }: { initialTerms?: TeachingTerms }) {
  const { t } = useI18n();
  const c = t.instructors.apply;
  const terms = useQuery({ queryKey: qk.teachingTerms, queryFn: siteApi.teachingTerms, initialData: initialTerms });

  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
      <div className="grid items-start gap-10 pt-6 pb-[clamp(3rem,7vw,5rem)] lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <section aria-labelledby="teach-title" className="flex flex-col gap-8 lg:sticky lg:top-8">
          <div className="flex flex-col gap-5">
            <span className="label-mono text-muted-foreground">{c.kicker}</span>
            <h1 id="teach-title" className="font-display text-[clamp(44px,6.5vw,88px)] leading-[0.9] font-extrabold">
              {c.titleA}
              <span className="block font-light">{c.titleB}</span>
            </h1>
            <p className="max-w-lg text-lg text-soft-foreground">{c.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {c.badges.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-1.5 text-sm font-bold text-sage-fg">
                <Check className="size-4" aria-hidden /> {b}
              </li>
            ))}
          </ul>
          <ShareGlance terms={terms.data} />
        </section>

        <div className="flex flex-col gap-6">
          <div id="join" className="scroll-mt-24">
            <JoinPanel />
          </div>
          <ExplainerVideo id="teach" title={t.explainers.teach} className="aspect-[4/5] w-full max-w-md self-center lg:self-start" />
        </div>
      </div>

      <Stories />
      <Steps />
      <Formats terms={terms.data} />
      <Tools />
      <Fees terms={terms.data} loading={terms.isPending} />
      <Faq />
      <ClosingCta />
    </div>
  );
}

/** The two headline numbers, right under the pitch, so nobody has to scroll to find out what they keep. */
function ShareGlance({ terms }: { terms?: TeachingTerms }) {
  const { t, f, fill } = useI18n();
  const c = t.instructors.apply;
  const rows = [
    { label: c.live.tag, value: terms?.liveCutPercent, Icon: Radio },
    { label: c.recorded.tag, value: terms?.recordedCutPercent, Icon: PlayCircle },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3">
      {rows.map(({ label, value, Icon }) => (
        <div key={label} className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="size-4" aria-hidden /> {label}
          </dt>
          <dd className="flex flex-col gap-0.5">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold tabular-nums">{value === undefined ? '—' : f.percent(value)}</span>
              <span className="text-sm text-muted-foreground">{c.yourShare}</span>
            </span>
            {value !== undefined && <span className="text-xs text-muted-foreground">{fill(c.azzaKeeps, { p: f.percent(100 - value) })}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function JoinPanel() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  const { user, role, isPending: authPending, refetch } = useAuth();
  const isStudent = role === 'STUDENT';
  const mine = useQuery({ queryKey: qk.myInstructorApplication, queryFn: instructorsApi.mine, enabled: isStudent, retry: false });

  if (authPending || (isStudent && mine.isPending)) return <Card><LoadingBlock rows={4} height={56} /></Card>;

  if (!user) {
    return (
      <Card tone="ink">
        <span className="label-mono text-mint">{c.kicker}</span>
        <h2 className="font-display text-[clamp(30px,4vw,44px)] leading-tight font-extrabold">{c.signedOutTitle}</h2>
        <p className="text-soft-foreground">{c.signedOutBody}</p>
        <ol className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-soft-foreground">
          {c.steps.slice(0, 3).map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="timecode text-mint">{`0${i + 1}`}</span> {s.title}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="sun">
            <Link href={`/sign-up?next=${encodeURIComponent('/teach#join')}`}>
              {c.createAccount} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/sign-in?next=${encodeURIComponent('/teach#join')}`}>{c.signIn}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (role === 'TEACHER' || role === 'ADMIN') {
    return (
      <Card tone="ink">
        <span className="label-mono text-mint">{c.kicker}</span>
        <h2 className="font-display text-[clamp(32px,4vw,44px)] leading-tight font-extrabold">{c.approvedTitle}</h2>
        <p className="text-soft-foreground">{mine.data?.status === 'APPROVED' ? c.approvedBody : c.teacherBody}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="sun">
            <Link href={PROPOSE}>
              {c.propose} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={STUDIO}>{c.studio}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (mine.isError) return <Card><ErrorState error={mine.error} onRetry={() => void mine.refetch()} compact /></Card>;

  const previous = mine.data ?? null;
  return (
    <Card>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-[28px] leading-tight font-extrabold">{c.formTitle}</h2>
        <p className="text-muted-foreground">{c.formSub}</p>
      </div>
      {/* The session's role flips to TEACHER on refetch (no cookie cache), which swaps this card for the studio one. */}
      <ApplicationForm key={previous?.id ?? 'new'} previous={previous} onDone={() => void refetch()} />
    </Card>
  );
}

/** The benefit illustrations, as a swipeable strip of story cards with a caption in the page's language. */
function Stories() {
  const { t, dir, fill } = useI18n();
  const c = t.instructors.apply;
  const strip = useRef<HTMLUListElement>(null);
  const step = (forward: boolean) => {
    const el = strip.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    const by = (card.getBoundingClientRect().width + 20) * (forward ? 1 : -1) * (dir === 'rtl' ? -1 : 1);
    el.scrollBy({ left: by, behavior: 'smooth' });
  };
  return (
    <section aria-labelledby="teach-why" className={SECTION}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <SectionHead id="teach-why" kicker={c.whyKicker} title={c.whyTitle} />
          <p className="text-lg text-soft-foreground">{c.whyBody}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="icon" aria-label={c.storiesPrev} onClick={() => step(false)}>
            <ArrowLeft className="rtl:rotate-180" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={c.storiesNext} onClick={() => step(true)}>
            <ArrowRight className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
      <ul
        ref={strip}
        className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
      >
        {c.stories.map((story) => (
          <li key={story.img} className="flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col gap-4">
            <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-card">
              <Image
                src={`/images/teach-benefits/${story.img}.webp`}
                alt={fill(c.storyAlt, { t: story.title })}
                width={720}
                height={1279}
                sizes="300px"
                className="h-auto w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <b className="font-display text-lg leading-snug">{story.title}</b>
              <span className="text-sm text-muted-foreground">{story.body}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Steps() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  return (
    <section aria-labelledby="teach-steps" className={SECTION}>
      <SectionHead id="teach-steps" kicker={c.stepsKicker} title={c.stepsTitle} />
      <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        {c.steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 border-t-2 border-foreground pt-4">
            <span className="timecode text-muted-foreground">{`0${i + 1}`}</span>
            <b className="font-display text-lg leading-snug">{s.title}</b>
            <span className="text-sm text-muted-foreground">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Formats({ terms }: { terms?: TeachingTerms }) {
  const { t, f, fill } = useI18n();
  const c = t.instructors.apply;
  const pct = (n?: number) => (n === undefined ? '—' : f.percent(n));
  const formats = [
    { copy: c.live, share: terms?.liveCutPercent, Icon: Radio, tone: 'ink' as const },
    { copy: c.recorded, share: terms?.recordedCutPercent, Icon: PlayCircle, tone: 'default' as const },
  ];
  return (
    <section aria-labelledby="teach-formats" className={SECTION}>
      <SectionHead id="teach-formats" kicker={c.formatsKicker} title={c.formatsTitle} />
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {formats.map(({ copy, share, Icon, tone }) => (
          <article
            key={copy.tag}
            className={cn(
              'flex flex-col gap-6 rounded-[22px] p-[clamp(1.5rem,3.5vw,2.5rem)]',
              tone === 'ink' ? 'theme-ink bg-ink-deep text-foreground' : 'border border-border bg-card',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className={cn('label-mono inline-flex items-center gap-2', tone === 'ink' ? 'text-mint' : 'text-muted-foreground')}>
                  <Icon className="size-4" aria-hidden /> {copy.tag}
                </span>
                <h3 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-extrabold">{copy.title}</h3>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="font-display text-[clamp(40px,5vw,60px)] leading-none font-extrabold tabular-nums">{pct(share)}</span>
                <span className="text-xs text-muted-foreground">{c.yourShare}</span>
                {share !== undefined && <span className="text-xs text-muted-foreground">{fill(c.azzaKeeps, { p: f.percent(100 - share) })}</span>}
              </div>
            </div>
            <p className="text-soft-foreground">{copy.body}</p>
            <ul className="flex flex-col gap-2.5">
              {copy.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm">
                  <Check className={cn('mt-0.5 size-4 shrink-0', tone === 'ink' ? 'text-mint' : 'text-green')} aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto border-t border-border pt-4 text-sm font-bold">{fill(copy.pay, { p: pct(share) })}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Tools() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  return (
    <section aria-labelledby="teach-tools" className={SECTION}>
      <SectionHead id="teach-tools" kicker={c.toolsKicker} title={c.toolsTitle} />
      <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {c.tools.map((tool, i) => {
          const Icon = TOOL_ICONS[i] ?? Check;
          return (
            <li key={tool.title} className="flex gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sage text-sage-fg">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <b className="font-display text-base">{tool.title}</b>
                <span className="text-sm text-muted-foreground">{tool.body}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fees({ terms, loading }: { terms?: TeachingTerms; loading: boolean }) {
  const { t, f, fill } = useI18n();
  const c = t.instructors.apply;
  const dash = '—';
  const pct = (n?: number) => (n === undefined ? dash : f.percent(n));
  const tiles = [
    { label: c.termLive, value: pct(terms?.liveCutPercent) },
    { label: c.termRecorded, value: pct(terms?.recordedCutPercent) },
    { label: c.termHold, value: terms ? fill(c.termHoldValue, { n: f.number(terms.earningHoldDays) }) : dash },
    { label: c.termMin, value: terms ? fill(c.termMinValue, { n: f.number(terms.minPayoutAed) }) : dash },
  ];
  const example = (cut?: number) => (cut === undefined ? dash : f.number(Math.round(10 * cut)));

  return (
    <section aria-labelledby="teach-fees" className={cn(SECTION, 'grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16')}>
      <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
        <SectionHead id="teach-fees" kicker={c.feesKicker} title={c.feesTitle} />
        <p className="max-w-md text-lg text-soft-foreground">{c.feesBody}</p>
      </div>

      <div className="flex flex-col gap-8">
        <dl className="grid grid-cols-2 gap-3" aria-busy={loading}>
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-5">
              <dt className="text-sm text-muted-foreground">{tile.label}</dt>
              <dd className="font-display text-[clamp(26px,3vw,36px)] leading-none font-extrabold tabular-nums">{tile.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-extrabold">{c.netTitle}</h3>
          <ol className="flex flex-col gap-3">
            {c.netSteps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background tabular-nums">
                  {i + 1}
                </span>
                <span className="pt-0.5">{fill(s, { v: pct(terms?.vatPercent) })}</span>
              </li>
            ))}
          </ol>
          <p className="rounded-2xl bg-sun p-4 font-bold text-ink">
            {fill(c.example, { live: example(terms?.liveCutPercent), rec: example(terms?.recordedCutPercent) })}
          </p>
        </div>

        <div className="flex gap-4 rounded-2xl border border-border bg-card p-5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Apple className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-base font-extrabold">{c.appleTitle}</h3>
            <p className="text-sm text-soft-foreground">{c.appleBody}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <h3 className="font-display text-xl font-extrabold">{c.payoutTitle}</h3>
          <p className="text-soft-foreground">
            {fill(c.payoutBody, { d: terms ? f.number(terms.earningHoldDays) : dash, m: terms ? f.number(terms.minPayoutAed) : dash })}
          </p>
          <p className="text-sm text-muted-foreground">{c.customNote}</p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  return (
    <section aria-labelledby="teach-faq" className={cn(SECTION, 'grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16')}>
      <h2 id="teach-faq" className="font-display text-[clamp(30px,4vw,48px)] leading-[0.95] font-extrabold">
        {c.faqTitle}
      </h2>
      <Accordion type="single" collapsible defaultValue="q0">
        {c.faq.map((item, i) => (
          <AccordionItem key={item.q} value={`q${i}`}>
            <AccordionTrigger className="font-display text-base">{item.q}</AccordionTrigger>
            <AccordionContent className="text-soft-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function ClosingCta() {
  const { t } = useI18n();
  const c = t.instructors.apply;
  const { role } = useAuth();
  const canTeach = role === 'TEACHER' || role === 'ADMIN';
  return (
    <section className="theme-ink mb-[clamp(2rem,5vw,4rem)] flex flex-col items-start gap-6 rounded-[28px] bg-ink-deep p-[clamp(1.75rem,5vw,4rem)] text-foreground md:flex-row md:items-center md:justify-between">
      <h2 className="max-w-xl font-display text-[clamp(30px,4.5vw,56px)] leading-[0.95] font-extrabold">{c.ctaTitle}</h2>
      <Button asChild size="lg" variant="sun">
        <Link href={canTeach ? PROPOSE : '#join'}>
          {canTeach ? c.propose : c.ctaButton} <ArrowRight className="rtl:rotate-180" />
        </Link>
      </Button>
    </section>
  );
}

function SectionHead({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <span className="label-mono text-muted-foreground">{kicker}</span>
      <h2 id={id} className="font-display text-[clamp(30px,4vw,52px)] leading-[0.95] font-extrabold">
        {title}
      </h2>
    </div>
  );
}

function Card({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'ink' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-[18px] p-[clamp(1.25rem,3vw,2.25rem)] shadow-card',
        tone === 'ink' ? 'theme-ink bg-ink-deep text-foreground' : 'border border-border bg-card',
      )}
    >
      {children}
    </div>
  );
}
