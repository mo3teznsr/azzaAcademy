'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appleRecordedProductId, aedToFils, filsToAed, recordedPricingInput, type CourseType } from '@azza/shared';
import { Check, Circle, Radio, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chip, type ChipTone } from '@/components/brand/status-chip';
import { PageTitle, Panel, SectionHeader } from '@/components/brand/section';
import { adminApi, ApiError, coursesApi, learningApi, teacherApi, type Course } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useI18n } from '@/lib/i18n/provider';
import { useMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useProposalError } from './proposal-review';

/** Step one of "New course": Live or Recorded. The type is fixed once the course exists. */
export function CourseTypePicker({ onPick }: { onPick: (t: CourseType) => void }) {
  const { t } = useI18n();
  const c = t.recordedOps.typePicker;
  const [value, setValue] = useState<CourseType>('LIVE');
  const opts = [
    { v: 'LIVE' as const, title: c.live, body: c.liveBody, Icon: Radio },
    { v: 'RECORDED' as const, title: c.recorded, body: c.recordedBody, Icon: Video },
  ];
  return (
    <>
      <PageTitle title={c.title} />
      <p className="max-w-2xl text-sm text-muted-foreground">{c.intro}</p>
      <RadioGroup value={value} onValueChange={(v) => setValue(v as CourseType)} aria-label={c.title} className="grid max-w-3xl gap-3 md:grid-cols-2">
        {opts.map(({ v, title, body, Icon }) => (
          <Label key={v} htmlFor={`type-${v}`} className={cn('flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 bg-card p-5', value === v ? 'border-ink' : 'border-border')}>
            <RadioGroupItem id={`type-${v}`} value={v} className="mt-1" />
            <span className="flex flex-col gap-1">
              <b className="flex items-center gap-2 font-display text-xl">
                <Icon className="size-5" aria-hidden /> {title}
              </b>
              <span className="text-sm font-normal text-muted-foreground">{body}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
      <Button variant="ink" className="self-start" onClick={() => onPick(value)}>
        {c.continue}
      </Button>
    </>
  );
}

/** What still blocks publishing a recorded course. Prices come from the course; lessons are counted from its lesson list. */
export function useRecordedMissing(course: Course | undefined, apiMissing?: Array<'PRICES' | 'LESSONS'>) {
  const enabled = course?.type === 'RECORDED';
  const lessons = useQuery({ queryKey: qk.lessons(course?.id ?? ''), queryFn: () => learningApi.lessons(course!.id), enabled });
  const lessonCount = lessons.data ? lessons.data.modules.reduce((n, m) => n + m.lessons.length, 0) : null;
  const missing: Array<'PRICES' | 'LESSONS'> = [];
  if (enabled) {
    if (!course!.monthlyPriceFils || !course!.yearlyPriceFils) missing.push('PRICES');
    if (lessonCount === 0) missing.push('LESSONS');
  }
  for (const m of apiMissing ?? []) if (!missing.includes(m)) missing.push(m);
  return { missing, lessons: lessons.data, lessonCount };
}

export function ReadinessChecklist({ missing }: { missing: Array<'PRICES' | 'LESSONS'> }) {
  const { t } = useI18n();
  const r = t.recordedOps.readiness;
  const items = [
    { k: 'PRICES' as const, label: r.prices },
    { k: 'LESSONS' as const, label: r.lessons },
  ];
  return (
    <section role="status" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <b className="font-display text-lg">{r.title}</b>
      <ul className="flex flex-col gap-1.5">
        {items.map(({ k, label }) => {
          const done = !missing.includes(k);
          return (
            <li key={k} className="flex items-center gap-2 text-[15px]">
              {done ? <Check className="size-4 text-sage-fg" aria-hidden /> : <Circle className="size-4 text-muted-foreground" aria-hidden />}
              <span className={cn(done && 'text-muted-foreground line-through')}>{label}</span>
              <span className="sr-only">{done ? t.common.yes : t.common.no}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Pulls `details.missing` out of a 422 RECORDED_NOT_READY. */
export function missingFromError(e: unknown): Array<'PRICES' | 'LESSONS'> | null {
  if (!(e instanceof ApiError) || e.code !== 'RECORDED_NOT_READY') return null;
  const m = (e.details as { missing?: unknown } | undefined)?.missing;
  return Array.isArray(m) ? m.filter((x): x is 'PRICES' | 'LESSONS' => x === 'PRICES' || x === 'LESSONS') : [];
}

const NONE = '__none';

/** Validation failure already shown inline; the mutation's onError must not toast it as well. */
class InlineError extends Error {}

export const SYNC_TONE: Record<'SYNCED' | 'SKIPPED' | 'FAILED', ChipTone> = { SYNCED: 'sage', SKIPPED: 'dashed', FAILED: 'danger' };

/** Studio and admin: the one lesson anyone can watch without a plan. */
export function PreviewLessonPicker({ course, lessons }: { course: Course; lessons: Awaited<ReturnType<typeof learningApi.lessons>> | undefined }) {
  const { t, pick, f } = useI18n();
  const c = t.recordedOps.preview;
  const errorText = useProposalError();
  const qc = useQueryClient();
  const flat = (lessons?.modules ?? []).flatMap((m, mi) => m.lessons.map((l, li) => ({ id: l.id, label: `${f.number(mi + 1)}.${f.number(li + 1)} ${pick(l.titleEn, l.titleAr).text}` })));
  const save = useMutation({
    mutationFn: (lessonId: string | null) => coursesApi.setPreviewLesson(course.id, lessonId),
    onSuccess: () => {
      toast.success(c.saved);
      void qc.invalidateQueries({ queryKey: qk.course(course.id) });
      void qc.invalidateQueries({ queryKey: qk.lessons(course.id) });
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.body}</p>
      {flat.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.noLessons}</p>
      ) : (
        <div className="flex max-w-md flex-col gap-1.5">
          <Label htmlFor="preview-lesson">{c.pick}</Label>
          <Select value={course.previewLessonId ?? NONE} onValueChange={(v) => save.mutate(v === NONE ? null : v)} disabled={save.isPending}>
            <SelectTrigger id="preview-lesson" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{c.none}</SelectItem>
              {flat.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Panel>
  );
}

/** Admin: prices before VAT, the per-course cut override and the Apple product ids. Each block saves on its own. */
export function RecordedPricingPanel({ course }: { course: Course }) {
  return (
    <div className="flex flex-col gap-5">
      <PricesBlock course={course} />
      <CutBlock course={course} />
      <AppleBlock course={course} />
    </div>
  );
}

function useRefresh(course: Course) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.course(course.id) });
    void qc.invalidateQueries({ queryKey: ['courses'] });
  };
}

function PricesBlock({ course }: { course: Course }) {
  const { t } = useI18n();
  const c = t.recordedOps.pricing;
  const refresh = useRefresh(course);
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [yearlyError, setYearlyError] = useState<string | null>(null);
  const errorText = useProposalError();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from the saved course
    setMonthly(course.monthlyPriceFils != null ? String(filsToAed(course.monthlyPriceFils)) : '');
    setYearly(course.yearlyPriceFils != null ? String(filsToAed(course.yearlyPriceFils)) : '');
  }, [course.monthlyPriceFils, course.yearlyPriceFils]);
  const save = useMutation({
    mutationFn: () => {
      const parsed = recordedPricingInput.safeParse({ monthlyPriceFils: aedToFils(Number(monthly)), yearlyPriceFils: aedToFils(Number(yearly)) });
      if (!monthly || !yearly || !parsed.success) {
        setYearlyError(c.invalid);
        throw new InlineError(c.invalid);
      }
      setYearlyError(null);
      return adminApi.setRecordedPricing(course.id, parsed.data);
    },
    onSuccess: () => {
      toast.success(c.saved);
      refresh();
    },
    onError: (e) => {
      if (!(e instanceof InlineError)) toast.error(errorText(e));
    },
  });
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-m">{c.monthly}</Label>
          <Input id="price-m" type="number" min={1} step="0.01" inputMode="decimal" dir="ltr" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-y">{c.yearly}</Label>
          <Input id="price-y" type="number" min={1} step="0.01" inputMode="decimal" dir="ltr" value={yearly} onChange={(e) => (setYearly(e.target.value), setYearlyError(null))} aria-invalid={!!yearlyError} aria-describedby={yearlyError ? 'price-y-err' : undefined} />
          {yearlyError && (
            <span id="price-y-err" role="alert" className="text-[13px] text-destructive">
              {yearlyError}
            </span>
          )}
        </div>
      </div>
      <Button type="button" variant="ink" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
        {c.save}
      </Button>
    </Panel>
  );
}

function CutBlock({ course }: { course: Course }) {
  const { t, fill } = useI18n();
  const c = t.recordedOps.cut;
  const errorText = useProposalError();
  const refresh = useRefresh(course);
  const cuts = useQuery({ queryKey: qk.admin.cuts, queryFn: adminApi.cuts });
  const [value, setValue] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from the saved course
    setValue(course.teacherCutPercent != null ? String(course.teacherCutPercent) : '');
  }, [course.teacherCutPercent]);
  const save = useMutation({
    mutationFn: () => {
      const n = value.trim() === '' ? null : Number(value);
      if (n !== null && (!Number.isInteger(n) || n < 0 || n > 100)) throw new Error(c.invalid);
      return adminApi.setCourseCut(course.id, n);
    },
    onSuccess: () => {
      toast.success(c.saved);
      refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p role="note" className="rounded-[14px] bg-peach p-3.5 text-sm text-ink">
        {c.warn}
      </p>
      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="cut-override">{c.label}</Label>
        <Input id="cut-override" type="number" min={0} max={100} step={1} inputMode="numeric" dir="ltr" placeholder={c.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        {cuts.data && <span className="text-[13px] text-muted-foreground">{fill(c.defaultNote, { n: cuts.data.recordedCutPercent })}</span>}
      </div>
      <Button type="button" variant="outline" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
        {c.save}
      </Button>
    </Panel>
  );
}

function AppleBlock({ course }: { course: Course }) {
  const { t, fill } = useI18n();
  const c = t.recordedOps.apple;
  const errorText = useProposalError();
  const refresh = useRefresh(course);
  const expected = { monthly: appleRecordedProductId(course.slug, 'MONTHLY'), yearly: appleRecordedProductId(course.slug, 'YEARLY') };
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [mismatch, setMismatch] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from the saved course
    setMonthly(course.appleProducts?.monthly ?? '');
    setYearly(course.appleProducts?.yearly ?? '');
  }, [course.appleProducts?.monthly, course.appleProducts?.yearly]);
  const save = useMutation({
    mutationFn: () => adminApi.setAppleProducts(course.id, { monthly: monthly.trim() || null, yearly: yearly.trim() || null }),
    onSuccess: () => {
      setMismatch(false);
      toast.success(c.saved);
      refresh();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'APPLE_PRODUCT_MISMATCH') setMismatch(true);
      toast.error(errorText(e));
    },
  });
  const field = (id: string, label: string, v: string, set: (s: string) => void, exp: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} dir="ltr" placeholder={exp} value={v} onChange={(e) => set(e.target.value)} aria-invalid={mismatch && !!v && v.trim() !== exp} />
      <span className="font-mono text-[12px] text-muted-foreground" dir="ltr">
        {fill(c.expected, { id: exp })}
      </span>
      {mismatch && !!v && v.trim() !== exp && <span className="text-[13px] text-destructive">{fill(c.mismatch, { id: exp })}</span>}
    </div>
  );
  return (
    <Panel>
      <SectionHeader title={c.title} size="sm" />
      <p className="text-sm text-muted-foreground">{c.intro}</p>
      <AppleSyncLine course={course} />
      <div className="grid gap-4 md:grid-cols-2">
        {field('apple-m', c.monthly, monthly, setMonthly, expected.monthly)}
        {field('apple-y', c.yearly, yearly, setYearly, expected.yearly)}
      </div>
      <Button type="button" variant="outline" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
        {c.save}
      </Button>
    </Panel>
  );
}

function AppleSyncLine({ course }: { course: Course }) {
  const { t, f, fill } = useI18n();
  const a = t.recordedOps.appStore;
  const status = course.appleSyncStatus ?? null;
  // The course DTO has the status only; the failure detail comes from the App Store status list.
  const store = useQuery({ queryKey: qk.admin.appStore, queryFn: adminApi.appStoreStatus, enabled: status === 'FAILED' });
  const detail = status === 'FAILED' ? store.data?.courses.find((x) => x.id === course.id)?.detail : null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{a.courseStatus}</span>
      {status ? <Chip tone={SYNC_TONE[status]}>{a.status[status]}</Chip> : <Chip tone="dashed">{a.neverSynced}</Chip>}
      {course.appleSyncedAt && <span className="text-[13px] text-muted-foreground">{fill(a.lastSynced, { d: f.dateLong(course.appleSyncedAt) })}</span>}
      {detail && <span className="basis-full text-[13px] text-destructive">{detail}</span>}
    </div>
  );
}

/** Subscriber counts (author or admin) and what the course has earned the author. Admins also get the full list. */
export function SubscribersPanel({ course, admin }: { course: Course; admin: boolean }) {
  const { t, f } = useI18n();
  const money = useMoney();
  const c = t.recordedOps.subscribers;
  const counts = useQuery({ queryKey: qk.courseSubscribers(course.id), queryFn: () => teacherApi.courseSubscribers(course.id) });
  const q = useQuery({ queryKey: qk.earnings, queryFn: teacherApi.earnings, enabled: !admin });
  const mine = (q.data?.ledger ?? []).filter((l) => l.course?.id === course.id);
  const earned = q.data?.courses.find((x) => x.courseId === course.id)?.earnedFils ?? 0;
  const tiles = counts.data
    ? [
        { k: c.active, v: counts.data.active },
        { k: c.cancelling, v: counts.data.cancelling },
        { k: c.pastDue, v: counts.data.pastDue },
        { k: c.total, v: counts.data.total },
      ]
    : [];
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <SectionHeader title={c.title} size="sm" />
        {counts.isError ? (
          <p role="alert" className="text-sm text-destructive">{c.loadFailed}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {counts.isPending
              ? [0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)
              : tiles.map((x) => (
                  <div key={x.k} className="rounded-xl border border-border bg-card p-4">
                    <dt className="label-mono text-muted-foreground">{x.k}</dt>
                    <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums">{f.number(x.v)}</dd>
                  </div>
                ))}
          </dl>
        )}
        {admin && (
          <Button asChild variant="outline" className="self-start">
            <Link href={`/admin/subscriptions?courseId=${course.id}`}>{c.adminLink}</Link>
          </Button>
        )}
      </Panel>
      {!admin && (
        <Panel>
          <SectionHeader title={c.earningsTitle} size="sm" aside={<b className="tabular-nums">{`${c.earnedTotal}: ${money.aed(earned)}`}</b>} />
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.none}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mine.slice(0, 20).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border p-3 text-sm">
                  <span className="text-muted-foreground">{f.dayMonth(l.createdAt)}</span>
                  <b>{money.aed(l.amountFils)}</b>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-muted-foreground">{c.note}</p>
          <Button asChild variant="outline" className="self-start">
            <Link href="/studio/earnings">{c.seeEarnings}</Link>
          </Button>
        </Panel>
      )}
    </div>
  );
}
